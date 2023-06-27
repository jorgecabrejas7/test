from collections import OrderedDict
import lmfit
import numpy as np
import math

class Optimizer():

    def init(self, model):
        self.base_model = model
        self.model = lmfit.Model(model.function)
        self.initial_values = self.init_values()
        self.params = self.init_params()

    def init_values(self):
        initial_values = {}
        param_values = self.base_model.initial_values
        for idx, param in enumerate(self.model.param_names):
                initial_values[param] = param_values[idx]
        return initial_values
    
    def init_params(self):
        params = lmfit.Parameters()
        for p in self.initial_values:
            params.add(p, min=0)
        return params
    
    def fit_goodness(self, xdata, ydata):
        goodness = {'data':{}, 'metrics':{}}
        parameters = {}

        # fit
        xdata = xdata[:len(ydata)]
        
        fit_result = self.model.fit(ydata, self.params, x=xdata, **self.initial_values)
        parameters_values = OrderedDict(sorted(fit_result.best_values.items(), key=lambda t: t[0]))

        parameters_ci = OrderedDict()
        parameters_se = OrderedDict()
        parameters_co = OrderedDict()

        try:
            ci = fit_result.conf_interval()
            for par in fit_result.var_names:
                parameters_ci[par] = [ci[par][1][1], ci[par][len(ci[par])-2][1]]
        except:
            for par in fit_result.var_names:
                parameters_ci[par] = [0, 0]

        for idx, var in enumerate(fit_result.var_names):
            parameters_se[var] = fit_result.covar[idx][idx] if fit_result.covar is not None else 0
            parameters_co[var] = OrderedDict()
            for idx2, var2 in enumerate(fit_result.var_names):
                if var != var2:
                    parameters_co[var][var2] = fit_result.covar[idx][idx2] if fit_result.covar is not None else 0

        r2 = self.get_r2(ydata, fit_result.residual)
        rmse = self.get_rmse(ydata, fit_result.residual)
        fb = self.get_fb(ydata, fit_result.best_fit)

        parameters = {'values': parameters_values, 'ci': parameters_ci, 'se': parameters_se, 'co': parameters_co}

        # saves the data
        goodness['data']['exp_data'] = ydata
        goodness['data']['model_data'] = fit_result.best_fit

        # saves metrics
        goodness['metrics']['r2'] = r2
        goodness['metrics']['rmse'] = rmse
        goodness['metrics']['fb'] = abs(fb)

        return parameters, goodness

    def get_r2(self, ydata, residual):
        diff_sqr = np.power(ydata-np.mean(ydata),2)
        SCT = np.sum(diff_sqr)
        resnorm = np.linalg.norm(residual)
        R2 = 1-np.power(resnorm,2)/SCT
        return R2
    
    def get_rmse(self, ydata, residual):
        nsamples = len(ydata)
        ydata = np.array(ydata)
        rmse = np.sqrt((1.0/nsamples)*np.sum(np.nan_to_num(residual**2)))
        return rmse

    def get_fb(self, ydata, predicted):
        ydata = np.array(ydata)
        fb = np.sum(np.subtract(predicted, ydata))/(0.5*np.sum(np.add(ydata, predicted)))
        return fb