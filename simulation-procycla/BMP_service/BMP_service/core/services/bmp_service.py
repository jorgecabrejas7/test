from BMP_service.core.simulation.optimizer import Optimizer
from BMP_service.core.simulation.models.po import PO
from BMP_service.core.schemas.bmp_result import BMPResultList
from BMP_service.core.settings import settings
from BMP_service.core.exceptions.bmp_exception import BMPException
import configparser
from fastapi import Depends
import numpy as np

class BMPService:

    def  __init__(self, optimizer: Optimizer = Depends(Optimizer)):
        model = PO()
        optimizer.init(model)
        self.optimizer = optimizer
        self.config = configparser.ConfigParser(allow_no_value=True)
        self.config.read(settings.CONFIG_FILE_PATH)
        self.pc_biogas_inf = float(self.config['energy']['pc-biogas-inf'])
        self.r_chp_caldera = float(self.config['energy']['r-chp-caldera'])
        self.r_chp_motor = float(self.config['energy']['r-chp-motor'])

    def run_bmp(self, data):
        try:
            final_status_code = 0
            result_list = []
            xdata = data.time
            for substrate in data.substrates:
                ydata = substrate.values
                parameters, goodness = self.optimizer.fit_goodness(xdata=xdata, ydata=ydata)
                metric_dict, param_dict, status_code = self.check_values(parameters, goodness)
                energy = self.get_energy(parameters['values']['a'], data.flow, data.volatile_solid)
                if status_code == 1:
                    final_status_code = 1

                result_list.append({'status_code': status_code, 'name':substrate.name, 'values':ydata, 'predicted_values':goodness['data']['model_data'].tolist(), 'params':param_dict, 'metrics':metric_dict, 'energy': energy})
            
            result = {'status_code': final_status_code, 'time':data.time, 'substrates':result_list}
            bmp_result_object = BMPResultList.parse_obj(result)
            return bmp_result_object
        except:
            raise BMPException("BMP module failed for given data: {}".format(data))

    def check_values(self, params, goodness):
        status_code = 0
        metric_dict = self.check_metrics(goodness)
        params_dict = self.check_params(params)

        if metric_dict['status_code'] == 1 or params_dict['status_code'] == 1:
            status_code = 1
        
        return metric_dict, params_dict, status_code
    
    def check_params(self, params):
        parameters = []
        param_status_code = 0
        for key, value in params['values'].items():
            status_codes = []
            if key in self.config.sections():

                # first condition
                a1 = self.config[key]['greater-than']
                a2 = self.config[key]['less-than']
                if ((a1 is not None) and (not value > float(a1))) or ((a2 is not None) and (not value < float(a2))):
                    status_codes.append(int(self.config[key]['status-code']))

                # second condition
                a1 = self.config[key+'-cinf']['greater-than']
                a2 = self.config[key+'-cinf']['less-than']
                cinf = params['ci'][key][0]
                if ((a1 is not None) and (not cinf > float(a1))) or ((a2 is not None) and (not cinf < float(a2))):
                    status_codes.append(int(self.config[key+'-cinf']['status-code']))

                # second condition
                a1 = self.config[key+'-cinf-relation']['greater-than']
                a2 = self.config[key+'-cinf-relation']['less-than']
                if ((a1 is not None) and (not (value-cinf) > (float(a1)*value))) or ((a2 is not None) and (not (value-cinf) < (float(a2)*value))):
                    status_codes.append(int(self.config[key+'-cinf-relation']['status-code']))

            if len(status_codes) == 0:
                status_codes.append(0)
            else:
                param_status_code = 1

            covar_list = []
            for covar_key, covar_value in params['co'][key].items():
                covar_list.append({'covar_to': covar_key, 'value': covar_value})

            if key in self.config.sections():
                parameters.append({'status_codes':status_codes, 'name':key, 'value':value, 'ci_inf':params['ci'][key][0], 'ci_sup':params['ci'][key][1], 'se':params['se'][key], 'covar_list':covar_list})

        return {'status_code': param_status_code, 'params':parameters}
    
    def check_metrics(self, goodness):
        metrics = []
        metric_status_code = 0
        for key, value in goodness['metrics'].items():
            if key in self.config.sections():
                status_code = 0
                a1 = self.config[key]['greater-than']
                a2 = self.config[key]['less-than']
                if ((a1 is not None) and (not value > float(a1))) or ((a2 is not None) and (not value < float(a2))):
                    status_code = int(self.config[key]['status-code'])
                    metric_status_code = status_code
                if np.isnan(value) or np.isinf(value):
                    value = -1
                    status_code = int(self.config[key]['status-code'])
                    metric_status_code = status_code
                metrics.append({'status_code': status_code, 'name': key, 'value': value})
            else:
                metrics.append({'status_code': 0, 'name': key, 'value': value})
        
        return {'status_code':metric_status_code, 'metrics':metrics}
    
    def get_energy(self, bo, flow, volatile_solid):
        EBG = bo*(flow*volatile_solid)*3.65*self.pc_biogas_inf
        ETG = EBG*self.r_chp_caldera
        EEG = EBG*self.r_chp_motor

        return [{'name': 'EBG', 'value': EBG}, {'name': 'ETG', 'value': ETG}, {'name': 'EEG', 'value': EEG}]