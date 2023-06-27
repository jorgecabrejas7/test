import pandas as pd
import numpy as np
import scipy.integrate
from decimal import Decimal
from CSTR_service.core.settings import settings
from os import path
from json import loads, dumps
from math import isnan
from requests import post

class ADM1:

    def __init__(self):

        self.deltaKh = float(settings.config['uncertainty']['Kh'])
        self.deltaBo = float(settings.config['uncertainty']['Bo'])
        self.max_trh = float(settings.config.get('checkpoint', "max-trh"))
        self.min_trh = float(settings.config.get('checkpoint', "min-trh"))
        self.converge_ratio = float(settings.config.get('checkpoint', "converge-ratio"))

        for file in loads(settings.config.get('constant-files', "path-list")):
            self.init_global_data(pd.read_csv(path.join(settings.CONFIG_DIR_PATH, 'param_files', file), dtype=str))

        initial_params = pd.read_csv(path.join(settings.CONFIG_DIR_PATH, 'param_files', settings.config["constant-files"]["initial-values-path"]), dtype=str)

        self.state_zero = [float(Decimal(x)) for x in initial_params.loc[[0]].values.flatten().tolist()]
        self.init_columns = initial_params.columns[1:].tolist()
        self.init_columns.append('pH')

        self.init_dependent_params()

    def init_global_data(self, dataframe, idx = 0):
        for name in dataframe:
            self.__setattr__(name, float(Decimal(dataframe[name][idx])))

    def dynamic_simulation(self, user_input):

        state_zero = self.state_zero[1:].copy()
        state_zero.append(user_input['pH_in'])
        simulate_results = pd.DataFrame([state_zero], columns=self.init_columns)
        gasflow = pd.DataFrame({'q_gas': [0], 'q_ch4%': [0]})

        state_input = self.get_state_input(user_input)

        trh = user_input['V_liq']/user_input['q_ad']
        current_day = 1

        while self.running_condition(trh, current_day, simulate_results, 3):
            tstep = [current_day-1,current_day]
            S_su, S_aa, S_fa, S_va, S_bu, S_pro, S_ac, S_h2, S_ch4, S_IC, S_IN, S_I, X_xc, X_ch, X_pr, X_li, X_su, X_aa, X_fa, X_c4, X_pro, X_ac, X_h2, X_I, S_cation, S_anion, S_H_ion, S_va_ion, S_bu_ion, S_pro_ion, S_ac_ion, S_hco3_ion, S_co2, S_nh3, S_nh4_ion, S_gas_h2, S_gas_ch4, S_gas_co2, pH = self.simulate(t_step = tstep, state_zero=state_zero, state_input=state_input, user_input=user_input, solvermethod='DOP853')
            S_va_ion, S_bu_ion, S_pro_ion, S_ac_ion, S_hco3_ion, S_nh3, S_H_ion, pH, p_gas_h2, S_h2, S_nh4_ion, S_co2 = self.DAESolve(S_su, S_aa, S_fa, S_va, S_bu, S_pro, S_ac, S_h2, S_ch4, S_IC, S_IN, S_I, X_xc, X_ch, X_pr, X_li, X_su, X_aa, X_fa, X_c4, X_pro, X_ac, X_h2, X_I, S_cation, S_anion, S_H_ion, S_va_ion, S_bu_ion, S_pro_ion, S_ac_ion, S_hco3_ion, S_co2, S_nh3, S_nh4_ion, S_gas_h2, S_gas_ch4, S_gas_co2, user_input['V_liq'], user_input['q_ad'], state_input[7])
    
            # gas data for plots
            p_gas_h2 = (S_gas_h2 * self.R * self.T_op / 16)
            p_gas_ch4 = (S_gas_ch4 * self.R * self.T_op / 64)
            p_gas_co2 = (S_gas_co2 * self.R * self.T_op)
            p_gas = (p_gas_h2 + p_gas_ch4 + p_gas_co2 + self.p_gas_h2o)
            q_gas = (self.k_p * (p_gas- self.p_atm))
            if q_gas < 0:    
                q_gas = 0

            q_ch4 = q_gas * (p_gas_ch4/p_gas) # methane flow
            if q_ch4 < 0:
                q_ch4 = 0
            q_ch4_porc = q_ch4*100/q_gas
            if isnan(q_ch4_porc):
                q_ch4_porc = 0

            flowtemp = {'q_gas' : q_gas, 'q_ch4%' : q_ch4_porc}
            gasflow.loc[len(gasflow)] = flowtemp

            # DOQ

            S_nh4_ion = S_IN - S_nh3
            S_co2 = S_IC - S_hco3_ion
            state_zero = [S_su, S_aa, S_fa, S_va, S_bu, S_pro, S_ac, S_h2, S_ch4, S_IC, S_IN, S_I, X_xc, X_ch, X_pr, X_li, X_su, X_aa, X_fa, X_c4, X_pro, X_ac, X_h2, X_I, S_cation, S_anion, S_H_ion, S_va_ion, S_bu_ion, S_pro_ion, S_ac_ion, S_hco3_ion, S_co2, S_nh3, S_nh4_ion, S_gas_h2, S_gas_ch4, S_gas_co2, pH]
      
            simulate_results.loc[len(simulate_results)] = state_zero


            if simulate_results.loc[len(simulate_results)-1].min() <= 0 or current_day > trh*self.max_trh:
                result = {
                    'days_simulated': current_day,
                    'trh': trh,
                    'status_code': 1,
                    'result': {
                        'simulate_results': simulate_results.to_dict(orient="list"),
                        'gasflow': gasflow.to_dict(orient="list")
                    }
                }
                self.update_progress(result, user_input['result_url'])
                return result
            else:
                result = {
                    'days_simulated': current_day,
                    'trh': trh,
                }
                self.update_progress(result, user_input['progress_url'])
            
            current_day += 1

        DQOcurve = pd.DataFrame(columns=['DQOt', 'DQOs'])
        DQOcurve['DQOt'] = simulate_results.S_su +simulate_results.S_aa +simulate_results.S_fa +simulate_results.S_va +simulate_results.S_bu +simulate_results.S_pro +simulate_results.S_ac +simulate_results.S_h2 +simulate_results.S_ch4 +simulate_results.S_I +simulate_results.X_xc +simulate_results.X_ch +simulate_results.X_pr +simulate_results.X_li +simulate_results.X_su +simulate_results.X_aa +simulate_results.X_fa +simulate_results.X_c4 +simulate_results.X_pro +simulate_results.X_ac +simulate_results.X_h2 +simulate_results.X_I +simulate_results.S_va_ion +simulate_results.S_bu_ion +simulate_results.S_pro_ion +simulate_results.S_ac_ion
        DQOcurve['DQOs'] = simulate_results.S_su +simulate_results.S_aa +simulate_results.S_fa +simulate_results.S_va +simulate_results.S_bu +simulate_results.S_pro +simulate_results.S_ac +simulate_results.S_h2 +simulate_results.S_ch4 +simulate_results.S_I +simulate_results.S_va_ion +simulate_results.S_bu_ion +simulate_results.S_pro_ion +simulate_results.S_ac_ion

        # Nitrogen data for plots
        Ncurve = pd.DataFrame(simulate_results.S_IN*14 ,columns=['Na'])

        final_result = {
            'days_simulated': current_day,
            'trh': trh,
            'status_code': 0,
            'result': {
                'simulate_results': simulate_results.to_dict(orient="list"),
                'gasflow': gasflow.to_dict(orient="list"),
                'dqo_curve': DQOcurve.to_dict(orient="list"),
                'n_curve': Ncurve.to_dict(orient="list")
            }
        }
        self.update_progress(final_result, user_input['result_url'])
        return final_result

    def propagate_uncertainty(self, user_input):

        studentFactor95 = scipy.stats.t.ppf(q=0.95 + 0.05/2, df=user_input['NSamples']-2, loc=0, scale=1)

        qGas_max_len = min(len(user_input['KhDelta_qGas']), len(user_input['Original_qGas']), len(user_input['BoDelta_qGas']))
        pH_max_len = min(len(user_input['KhDelta_pH']), len(user_input['Original_pH']), len(user_input['BoDelta_pH']))

        dBioGasdKh = abs((np.subtract(user_input['KhDelta_qGas'][0:qGas_max_len], user_input['Original_qGas'][0:qGas_max_len]))/self.deltaKh)
        dpHdKh = abs((np.subtract(user_input['KhDelta_pH'][0:pH_max_len], user_input['Original_pH'][0:pH_max_len]))/self.deltaKh)

        dBioGasdBo = abs((np.subtract(user_input['BoDelta_qGas'][0:qGas_max_len], user_input['Original_qGas'][0:qGas_max_len]))/self.deltaBo)
        dpHdBo = abs((np.subtract(user_input['BoDelta_pH'][0:pH_max_len], user_input['Original_pH'][0:pH_max_len]))/self.deltaBo)

        #Cálculo incertidumbre
        KhSE = user_input['KhSE']
        BoSE = user_input['BoSE']
        KhBoCovariance = user_input['BoKhCovariance']
        qGas_uncertainty = studentFactor95 * np.sqrt(KhSE**2 * dBioGasdKh**2 + BoSE**2 * dBioGasdBo**2 + 2 * dBioGasdBo * dBioGasdKh * KhBoCovariance)
        pH_uncertainty = studentFactor95 * np.sqrt(KhSE**2 * dpHdKh**2 + BoSE**2 * dpHdBo**2 + 2 * dpHdBo * dpHdKh * KhBoCovariance)
        qGas_uncertainty = np.nan_to_num(qGas_uncertainty, nan=0.0)
        pH_uncertainty = np.nan_to_num(pH_uncertainty, nan=0.0)

        #Valores máximos y mínimos dentro de los intervalos de confianza
        qGas_Min = user_input['Original_qGas'][0:qGas_max_len] - qGas_uncertainty
        qGas_Max = user_input['Original_qGas'][0:qGas_max_len] + qGas_uncertainty

        pH_Min = user_input['Original_pH'][0:pH_max_len] - pH_uncertainty
        pH_Max = user_input['Original_pH'][0:pH_max_len] + pH_uncertainty

        return [{
                'name': 'gas',
                'value': user_input['Original_qGas'][0:qGas_max_len],
                'min': qGas_Min.tolist(),
                'max': qGas_Max.tolist()
            },
            {
                'name': 'ph',
                'value': user_input['Original_pH'][0:pH_max_len],
                'min': pH_Min.tolist(),
                'max': pH_Max.tolist()
            }]

    def running_condition(self, trh, current_day, simulate_results, last_x):
        keep_going = True
        if current_day > self.min_trh*trh:
            last_x_rows = simulate_results.iloc[-(last_x+1):]
            shifted_results = last_x_rows.shift(-1, axis=0, fill_value=0)
            difference = (last_x_rows - shifted_results).abs().iloc[-(last_x+1):-1]             # |(Xi-1) - Xi|
            threshold = (shifted_results*self.converge_ratio).iloc[-(last_x+1):-1]

            diff = difference - threshold   # if a - b is negative then a < b
            if diff._values.max() < 0:
                keep_going = False

        return keep_going

    def simulate(self, t_step, state_zero, state_input, user_input, solvermethod = 'DOP853'):
        r = scipy.integrate.solve_ivp(self.ADM1_ODE, t_step, state_zero, method= solvermethod, rtol = 1e-7, args=(state_input, user_input['q_ad'], user_input['V_liq'], user_input['V_gas'], user_input['Kh']))
        return r.y[:,-1].T

    def ADM1_ODE(self, t, state_zero, state_input, q_ad, V_liq, V_gas, k_hyd):

        S_su, S_aa, S_fa, S_va, S_bu, S_pro, S_ac, S_h2, S_ch4, S_IC, S_IN, S_I, X_xc, X_ch, X_pr, X_li, X_su, X_aa, X_fa, X_c4, X_pro, X_ac, X_h2, X_I, S_cation, S_anion, S_H_ion, S_va_ion, S_bu_ion, S_pro_ion, S_ac_ion, S_hco3_ion, S_co2, S_nh3, S_nh4_ion, S_gas_h2, S_gas_ch4, S_gas_co2, pH = state_zero
        S_su_in,S_aa_in,S_fa_in,S_va_in,S_bu_in,S_pro_in,S_ac_in,S_h2_in,S_ch4_in,S_IC_in,S_IN_in,S_I_in,X_xc_in,X_ch_in,X_pr_in,X_li_in,X_su_in,X_aa_in,X_fa_in,X_c4_in,X_pro_in,X_ac_in,X_h2_in,X_I_in,S_cation_in,S_anion_in = state_input

        S_nh4_ion = S_IN - S_nh3
        S_co2 = S_IC - S_hco3_ion

        I_pH_aa = (self.K_pH_aa ** self.nn_aa) / (S_H_ion ** self.nn_aa + self.K_pH_aa ** self.nn_aa)
        I_pH_ac = (self.K_pH_ac ** self.n_ac) / (S_H_ion ** self.n_ac + self.K_pH_ac ** self.n_ac)
        I_pH_h2 = (self.K_pH_h2 ** self.n_h2) / (S_H_ion ** self.n_h2 + self.K_pH_h2 ** self.n_h2)
        I_IN_lim = 1 / (1 + (self.K_S_IN / S_IN))
        I_h2_fa = 1 / (1 + (S_h2 / self.K_I_h2_fa))
        I_h2_c4 = 1 / (1 + (S_h2 / self.K_I_h2_c4))
        I_h2_pro = 1 / (1 + (S_h2 / self.K_I_h2_pro))
        I_nh3 = 1 / (1 + (S_nh3 / self.K_I_nh3))

        # biochemical process rates from Rosen et al (2006) BSM2 report
        Rho_1 = self.k_dis * X_xc  # Disintegration
        Rho_2 = k_hyd * X_ch # Hydrolysis of carbohydrates
        Rho_3 = k_hyd * X_pr # Hydrolysis of proteins
        Rho_4 = k_hyd * X_li  # Hydrolysis of lipids
        Rho_5 = self.k_m_su * S_su / (self.K_S_su + S_su) * X_su * (I_pH_aa * I_IN_lim) # Uptake of sugars
        Rho_6 = self.k_m_aa * (S_aa / (self.K_S_aa + S_aa)) * X_aa * (I_pH_aa * I_IN_lim)  # Uptake of amino-acids
        Rho_7 = self.k_m_fa * (S_fa / (self.K_S_fa + S_fa)) * X_fa * (I_pH_aa * I_IN_lim * I_h2_fa)  # Uptake of LCFA (long-chain fatty acids)
        Rho_8 = self.k_m_c4 * (S_va / (self.K_S_c4 + S_va)) * X_c4 * (S_va / (S_bu + S_va + 1e-6)) * (I_pH_aa * I_IN_lim * I_h2_c4)  # Uptake of valerate
        Rho_9 = self.k_m_c4 * (S_bu / (self.K_S_c4 + S_bu)) * X_c4 * (S_bu / (S_bu + S_va + 1e-6)) * (I_pH_aa * I_IN_lim * I_h2_c4)  # Uptake of butyrate
        Rho_10 = self.k_m_pro * (S_pro / (self.K_S_pro + S_pro)) * X_pro * (I_pH_aa * I_IN_lim * I_h2_pro)  # Uptake of propionate
        Rho_11 = self.k_m_ac * (S_ac / (self.K_S_ac + S_ac)) * X_ac * (I_pH_ac * I_IN_lim * I_nh3)  # Uptake of acetate
        Rho_12 = self.k_m_h2 * (S_h2 / (self.K_S_h2 + S_h2)) * X_h2 * (I_pH_h2 * I_IN_lim)  # Uptake of hydrogen
        Rho_13 = self.k_dec_X_su * X_su  # Decay of X_su
        Rho_14 = self.k_dec_X_aa * X_aa  # Decay of X_aa
        Rho_15 = self.k_dec_X_fa * X_fa  # Decay of X_fa
        Rho_16 = self.k_dec_X_c4 * X_c4  # Decay of X_c4
        Rho_17 = self.k_dec_X_pro * X_pro  # Decay of X_pro
        Rho_18 = self.k_dec_X_ac * X_ac  # Decay of X_ac
        Rho_19 = self.k_dec_X_h2 * X_h2  # Decay of X_h2

        # acid-base rates for the BSM2 ODE implementation from Rosen et al (2006) BSM2 report TODO: not used?
        # Rho_A_4 = self.k_A_B_va * (S_va_ion * (self.K_a_va + S_H_ion) - self.K_a_va * S_va)
        # Rho_A_5 = self.k_A_B_bu * (S_bu_ion * (self.K_a_bu + S_H_ion) - self.K_a_bu * S_bu)
        # Rho_A_6 = self.k_A_B_pro * (S_pro_ion * (self.K_a_pro + S_H_ion) - self.K_a_pro * S_pro)
        # Rho_A_7 = self.k_A_B_ac * (S_ac_ion * (self.K_a_ac + S_H_ion) - self.K_a_ac * S_ac)
        # Rho_A_10 = self.k_A_B_co2 * (S_hco3_ion * (self.K_a_co2 + S_H_ion) - self.K_a_co2 * S_IC)
        # Rho_A_11 = self.k_A_B_IN * (S_nh3 * (self.K_a_IN + S_H_ion) - self.K_a_IN * S_IN)

        # gas phase algebraic equations from Rosen et al (2006) BSM2 report
        p_gas_h2 = S_gas_h2 * self.R * self.T_op / 16.0
        p_gas_ch4 = S_gas_ch4 * self.R * self.T_op / 64.0
        p_gas_co2 = S_gas_co2 * self.R * self.T_op


        p_gas = p_gas_h2 + p_gas_ch4 + p_gas_co2 + self.p_gas_h2o
        q_gas = self.k_p * (p_gas- self.p_atm)
        if q_gas < 0:    q_gas = 0

        # gas transfer rates from Rosen et al (2006) BSM2 report
        Rho_T_8 = self.k_L_a * (S_h2 - 16 * self.K_H_h2 * p_gas_h2)
        Rho_T_9 = self.k_L_a * (S_ch4 - 64 * self.K_H_ch4 * p_gas_ch4)
        Rho_T_10 = self.k_L_a * (S_co2 - self.K_H_co2 * p_gas_co2)

        diff_S_su = q_ad / V_liq * (S_su_in - S_su) + Rho_2 + (1 - self.f_fa_li) * Rho_4 - Rho_5  # eq1
        diff_S_aa = q_ad / V_liq * (S_aa_in - S_aa) + Rho_3 - Rho_6  # eq2
        diff_S_fa = q_ad / V_liq * (S_fa_in - S_fa) + (self.f_fa_li * Rho_4) - Rho_7  # eq3
        diff_S_va = q_ad / V_liq * (S_va_in - S_va) + (1 - self.Y_aa) * self.f_va_aa * Rho_6 - Rho_8  # eq4
        diff_S_bu = q_ad / V_liq * (S_bu_in - S_bu) + (1 - self.Y_su) * self.f_bu_su * Rho_5 + (1 - self.Y_aa) * self.f_bu_aa * Rho_6 - Rho_9  # eq5
        diff_S_pro = q_ad / V_liq * (S_pro_in - S_pro) + (1 - self.Y_su) * self.f_pro_su * Rho_5 + (1 - self.Y_aa) * self.f_pro_aa * Rho_6 + (1 - self.Y_c4) * 0.54 * Rho_8 - Rho_10  # eq6
        diff_S_ac = q_ad / V_liq * (S_ac_in - S_ac) + (1 - self.Y_su) * self.f_ac_su * Rho_5 + (1 - self.Y_aa) * self.f_ac_aa * Rho_6 + (1 - self.Y_fa) * 0.7 * Rho_7 + (1 - self.Y_c4) * 0.31 * Rho_8 + (1 - self.Y_c4) * 0.8 * Rho_9 + (1 - self.Y_pro) * 0.57 * Rho_10 - Rho_11  # eq7
        #diff_S_h2 is defined with DAE paralel equaitons
        diff_S_ch4 = q_ad / V_liq * (S_ch4_in - S_ch4) + (1 - self.Y_ac) * Rho_11 + (1 - self.Y_h2) * Rho_12 - Rho_T_9  # eq9

        ## eq10 start##
        s_1 = -1 * self.C_xc + self.f_sI_xc * self.C_sI + self.f_ch_xc * self.C_ch + self.f_pr_xc * self.C_pr + self.f_li_xc * self.C_li + self.f_xI_xc * self.C_xI
        s_2 = -1 * self.C_ch + self.C_su
        s_3 = -1 * self.C_pr + self.C_aa
        s_4 = -1 * self.C_li + (1 - self.f_fa_li) * self.C_su + self.f_fa_li * self.C_fa
        s_5 = -1 * self.C_su + (1 - self.Y_su) * (self.f_bu_su * self.C_bu + self.f_pro_su * self.C_pro + self.f_ac_su * self.C_ac) + self.Y_su * self.C_bac
        s_6 = -1 * self.C_aa + (1 - self.Y_aa) * (self.f_va_aa * self.C_va + self.f_bu_aa * self.C_bu + self.f_pro_aa * self.C_pro + self.f_ac_aa * self.C_ac) + self.Y_aa * self.C_bac
        s_7 = -1 * self.C_fa + (1 - self.Y_fa) * 0.7 * self.C_ac + self.Y_fa * self.C_bac
        s_8 = -1 * self.C_va + (1 - self.Y_c4) * 0.54 * self.C_pro + (1 - self.Y_c4) * 0.31 * self.C_ac + self.Y_c4 * self.C_bac
        s_9 = -1 * self.C_bu + (1 - self.Y_c4) * 0.8 * self.C_ac + self.Y_c4 * self.C_bac
        s_10 = -1 * self.C_pro + (1 - self.Y_pro) * 0.57 * self.C_ac + self.Y_pro * self.C_bac
        s_11 = -1 * self.C_ac + (1 - self.Y_ac) * self.C_ch4 + self.Y_ac * self.C_bac
        s_12 = (1 - self.Y_h2) * self.C_ch4 + self.Y_h2 * self.C_bac
        s_13 = -1 * self.C_bac + self.C_xc

        sigma = s_1 * Rho_1 + s_2 * Rho_2 + s_3 * Rho_3 + s_4 * Rho_4 + s_5 * Rho_5 + s_6 * Rho_6 + s_7 * Rho_7 + s_8 * Rho_8 + s_9 * Rho_9 + s_10 * Rho_10 + s_11 * Rho_11 + s_12 * Rho_12 + s_13 * (Rho_13 + Rho_14 + Rho_15 + Rho_16 + Rho_17 + Rho_18 + Rho_19)

        diff_S_IC = q_ad / V_liq * (S_IC_in - S_IC) - sigma - Rho_T_10
        ## eq10 end##
        
        diff_S_IN = q_ad / V_liq * (S_IN_in - S_IN) + (self.N_xc - self.f_xI_xc * self.N_I - self.f_sI_xc * self.N_I-self.f_pr_xc * self.N_aa) * Rho_1 - self.Y_su * self.N_bac * Rho_5 + (self.N_aa - self.Y_aa * self.N_bac) * Rho_6 - self.Y_fa * self.N_bac * Rho_7 - self.Y_c4 * self.N_bac * Rho_8 - self.Y_c4 * self.N_bac * Rho_9 - self.Y_pro * self.N_bac * Rho_10 - self.Y_ac * self.N_bac * Rho_11 - self.Y_h2 * self.N_bac * Rho_12 + (self.N_bac - self.N_xc) * (Rho_13 + Rho_14 + Rho_15 + Rho_16 + Rho_17 + Rho_18 + Rho_19) # eq11 
        diff_S_I = q_ad / V_liq * (S_I_in - S_I) + self.f_sI_xc * Rho_1  # eq12
        # Differential equations 13 to 24 (particulate matter)
        diff_X_xc = q_ad / V_liq * (X_xc_in - X_xc) - Rho_1 + Rho_13 + Rho_14 + Rho_15 + Rho_16 + Rho_17 + Rho_18 + Rho_19  # eq13 
        diff_X_ch = q_ad / V_liq * (X_ch_in - X_ch) + self.f_ch_xc * Rho_1 - Rho_2  # eq14 
        diff_X_pr = q_ad / V_liq * (X_pr_in - X_pr) + self.f_pr_xc * Rho_1 - Rho_3  # eq15 
        diff_X_li = q_ad / V_liq * (X_li_in - X_li) + self.f_li_xc * Rho_1 - Rho_4  # eq16 
        diff_X_su = q_ad / V_liq * (X_su_in - X_su) + self.Y_su * Rho_5 - Rho_13  # eq17
        diff_X_aa = q_ad / V_liq * (X_aa_in - X_aa) + self.Y_aa * Rho_6 - Rho_14  # eq18
        diff_X_fa = q_ad / V_liq * (X_fa_in - X_fa) + self.Y_fa * Rho_7 - Rho_15  # eq19
        diff_X_c4 = q_ad / V_liq * (X_c4_in - X_c4) + self.Y_c4 * Rho_8 + self.Y_c4 * Rho_9 - Rho_16  # eq20
        diff_X_pro = q_ad / V_liq * (X_pro_in - X_pro) + self.Y_pro * Rho_10 - Rho_17  # eq21
        diff_X_ac = q_ad / V_liq * (X_ac_in - X_ac) + self.Y_ac * Rho_11 - Rho_18  # eq22
        diff_X_h2 = q_ad / V_liq * (X_h2_in - X_h2) + self.Y_h2 * Rho_12 - Rho_19  # eq23
        diff_X_I = q_ad / V_liq * (X_I_in - X_I) + self.f_xI_xc * Rho_1  # eq24 
        # Differential equations 25 and 26 (cations and anions)
        diff_S_cation = q_ad / V_liq * (S_cation_in - S_cation)  # eq25
        diff_S_anion = q_ad / V_liq * (S_anion_in - S_anion)  # eq26
        diff_S_h2 = 0
        # Differential equations 27 to 32 (ion states, only for ODE implementation)
        diff_S_va_ion = 0   # eq27
        diff_S_bu_ion = 0   # eq28
        diff_S_pro_ion = 0  # eq29
        diff_S_ac_ion = 0   # eq30
        diff_S_hco3_ion = 0 # eq31
        diff_S_nh3 = 0      # eq32
        # Gas phase equations: Differential equations 33 to 35
        diff_S_gas_h2 = (q_gas / V_gas * -1 * S_gas_h2) + (Rho_T_8 * V_liq / V_gas)  # eq33
        diff_S_gas_ch4 = (q_gas / V_gas * -1 * S_gas_ch4) + (Rho_T_9 * V_liq / V_gas)  # eq34
        diff_S_gas_co2 = (q_gas / V_gas * -1 * S_gas_co2) + (Rho_T_10 * V_liq / V_gas)  # eq35

        diff_S_H_ion = 0
        diff_S_co2 = 0
        diff_S_nh4_ion = 0 #to keep the output same length as input for ADM1_ODE funcion

        return diff_S_su, diff_S_aa, diff_S_fa, diff_S_va, diff_S_bu, diff_S_pro, diff_S_ac, diff_S_h2, diff_S_ch4, diff_S_IC, diff_S_IN, diff_S_I, diff_X_xc, diff_X_ch, diff_X_pr, diff_X_li, diff_X_su, diff_X_aa, diff_X_fa, diff_X_c4, diff_X_pro, diff_X_ac, diff_X_h2, diff_X_I, diff_S_cation, diff_S_anion, diff_S_H_ion, diff_S_va_ion,  diff_S_bu_ion, diff_S_pro_ion, diff_S_ac_ion, diff_S_hco3_ion, diff_S_co2,  diff_S_nh3, diff_S_nh4_ion, diff_S_gas_h2, diff_S_gas_ch4, diff_S_gas_co2, diff_S_H_ion

    def DAESolve(self, S_su, S_aa, S_fa, S_va, S_bu, S_pro, S_ac, S_h2, S_ch4, S_IC, S_IN, S_I, X_xc, X_ch, X_pr, X_li, X_su, X_aa, X_fa, X_c4, X_pro, X_ac, X_h2, X_I, S_cation, S_anion, S_H_ion, S_va_ion, S_bu_ion, S_pro_ion, S_ac_ion, S_hco3_ion, S_co2, S_nh3, S_nh4_ion, S_gas_h2, S_gas_ch4, S_gas_co2, V_liq, q_ad, S_h2_in):
        eps = 0.0000001
        prevS_H_ion = S_H_ion

        shdelta = S_h2delta = shgradeq = S_h2gradeq = 1.0
        tol = 10 ** (-12) #solver accuracy tolerance
        maxIter = 1000 #maximum number of iterations for solver
        i = 1
        j = 1

        while ((shdelta > tol or shdelta < -tol) and (i <= maxIter)):
            S_va_ion = self.K_a_va * S_va / (self.K_a_va + S_H_ion)
            S_bu_ion = self.K_a_bu * S_bu / (self.K_a_bu + S_H_ion)
            S_pro_ion = self.K_a_pro * S_pro / (self.K_a_pro + S_H_ion)
            S_ac_ion = self.K_a_ac * S_ac / (self.K_a_ac + S_H_ion)
            S_hco3_ion = self.K_a_co2 * S_IC / (self.K_a_co2 + S_H_ion)
            S_nh3 = self.K_a_IN * S_IN / (self.K_a_IN + S_H_ion)
            shdelta = S_cation + (S_IN - S_nh3) + S_H_ion - S_hco3_ion - S_ac_ion / 64.0 - S_pro_ion / 112.0 - S_bu_ion / 160.0 - S_va_ion / 208.0 - self.K_w / S_H_ion - S_anion
            shgradeq = 1 + self.K_a_IN * S_IN / ((self.K_a_IN + S_H_ion) * (self.K_a_IN + S_H_ion)) + self.K_a_co2 * S_IC / ((self.K_a_co2 + S_H_ion) * (self.K_a_co2 + S_H_ion)) + 1 / 64.0 * self.K_a_ac * S_ac / ((self.K_a_ac + S_H_ion) * (self.K_a_ac + S_H_ion)) + 1 / 112.0 * self.K_a_pro * S_pro / ((self.K_a_pro + S_H_ion) * (self.K_a_pro + S_H_ion)) + 1 / 160.0 * self.K_a_bu * S_bu / ((self.K_a_bu + S_H_ion) * (self.K_a_bu + S_H_ion)) + 1 / 208.0 * self.K_a_va * S_va / ((self.K_a_va + S_H_ion) * (self.K_a_va + S_H_ion)) + self.K_w / (S_H_ion * S_H_ion)
            S_H_ion = S_H_ion - shdelta / shgradeq
            if S_H_ion <= 0:
                S_H_ion = tol
            i+=1

        # pH calculation
        pH = - np.log10(S_H_ion)
        
        #DAE solver for S_h2 from Rosen et al. (2006) 
        while ((S_h2delta > tol or S_h2delta < -tol) and (j <= maxIter)):
            I_pH_aa = (self.K_pH_aa ** self.nn_aa) / (prevS_H_ion ** self.nn_aa + self.K_pH_aa ** self.nn_aa)
        
            I_pH_h2 = (self.K_pH_h2 ** self.n_h2) / (prevS_H_ion ** self.n_h2 + self.K_pH_h2 ** self.n_h2)
            I_IN_lim = 1 / (1 + (self.K_S_IN / S_IN))
            I_h2_fa = 1 / (1 + (S_h2 / self.K_I_h2_fa))
            I_h2_c4 = 1 / (1 + (S_h2 / self.K_I_h2_c4))
            I_h2_pro = 1 / (1 + (S_h2 / self.K_I_h2_pro))
        
            I_5 = I_pH_aa * I_IN_lim
            I_6 = I_5
            I_7 = I_pH_aa * I_IN_lim * I_h2_fa
            I_8 = I_pH_aa * I_IN_lim * I_h2_c4
            I_9 = I_8
            I_10 = I_pH_aa * I_IN_lim * I_h2_pro
        
            I_12 = I_pH_h2 * I_IN_lim
            Rho_5 = self.k_m_su * (S_su / (self.K_S_su + S_su)) * X_su * I_5  # Uptake of sugars
            Rho_6 = self.k_m_aa * (S_aa / (self.K_S_aa + S_aa)) * X_aa * I_6  # Uptake of amino-acids
            Rho_7 = self.k_m_fa * (S_fa / (self.K_S_fa + S_fa)) * X_fa * I_7  # Uptake of LCFA (long-chain fatty acids)
            Rho_8 = self.k_m_c4 * (S_va / (self.K_S_c4 + S_va)) * X_c4 * (S_va / (S_bu + S_va+ 1e-6)) * I_8  # Uptake of valerate
            Rho_9 = self.k_m_c4 * (S_bu / (self.K_S_c4 + S_bu)) * X_c4 * (S_bu / (S_bu + S_va+ 1e-6)) * I_9  # Uptake of butyrate
            Rho_10 = self.k_m_pro * (S_pro / (self.K_S_pro + S_pro)) * X_pro * I_10  # Uptake of propionate
            Rho_12 = self.k_m_h2 * (S_h2 / (self.K_S_h2 + S_h2)) * X_h2 * I_12  # Uptake of hydrogen
            p_gas_h2 = S_gas_h2 * self.R * self.T_op / 16
            Rho_T_8 = self.k_L_a * (S_h2 - 16 * self.K_H_h2 * p_gas_h2)
            S_h2delta = q_ad / V_liq * (S_h2_in - S_h2) + (1 - self.Y_su) * self.f_h2_su * Rho_5 + (1 - self.Y_aa) * self.f_h2_aa * Rho_6 + (1 - self.Y_fa) * 0.3 * Rho_7 + (1 - self.Y_c4) * 0.15 * Rho_8 + (1 - self.Y_c4) * 0.2 * Rho_9 + (1 - self.Y_pro) * 0.43 * Rho_10 - Rho_12 - Rho_T_8
            S_h2gradeq = - 1.0 / V_liq * q_ad - 3.0 / 10.0 * (1 - self.Y_fa) * self.k_m_fa * S_fa / (self.K_S_fa + S_fa) * X_fa * I_pH_aa / (1 + self.K_S_IN / S_IN) / ((1 + S_h2 / self.K_I_h2_fa) * (1 + S_h2 / self.K_I_h2_fa)) / self.K_I_h2_fa - 3.0 / 20.0 * (1 - self.Y_c4) * self.k_m_c4 * S_va * S_va / (self.K_S_c4 + S_va) * X_c4 / (S_bu + S_va + eps) * I_pH_aa / (1 + self.K_S_IN / S_IN) / ((1 + S_h2 / self.K_I_h2_c4 ) * (1 + S_h2 / self.K_I_h2_c4 )) / self.K_I_h2_c4 - 1.0 / 5.0 * (1 - self.Y_c4) * self.k_m_c4 * S_bu * S_bu / (self.K_S_c4 + S_bu) * X_c4 / (S_bu + S_va + eps) * I_pH_aa / (1 + self.K_S_IN / S_IN) / ((1 + S_h2 / self.K_I_h2_c4 ) * (1 + S_h2 / self.K_I_h2_c4 )) / self.K_I_h2_c4 - 43.0 / 100.0 * (1 - self.Y_pro) * self.k_m_pro * S_pro / (self.K_S_pro + S_pro) * X_pro * I_pH_aa / (1 + self.K_S_IN / S_IN) / ((1 + S_h2 / self.K_I_h2_pro ) * (1 + S_h2 / self.K_I_h2_pro )) / self.K_I_h2_pro - self.k_m_h2 / (self.K_S_h2 + S_h2) * X_h2 * I_pH_h2 / (1 + self.K_S_IN / S_IN) + self.k_m_h2 * S_h2 / ((self.K_S_h2 + S_h2) * (self.K_S_h2 + S_h2)) * X_h2 * I_pH_h2 / (1 + self.K_S_IN / S_IN) - self.k_L_a
            S_h2 = S_h2 - S_h2delta / S_h2gradeq
            if S_h2 <= 0:
                S_h2 = tol
            j+=1

        return S_va_ion, S_bu_ion, S_pro_ion, S_ac_ion, S_hco3_ion, S_nh3, S_H_ion, pH, p_gas_h2, S_h2, S_nh4_ion, S_co2#, P_gas, q_gas

    def init_dependent_params(self):
        self.K_w =  10 ** -14.0 * np.exp((55900 / (100 * self.R)) * (1 / self.T_base - 1 / self.T_op))

        self.K_a_va =  10 ** -4.86
        self.K_a_bu =  10 ** -4.82
        self.K_a_pro =  10 ** -4.88
        self.K_a_ac =  10 ** -4.76

        self.K_a_co2 =  10 ** -6.35 * np.exp((7646 / (100 * self.R)) * (1 / self.T_base - 1 / self.T_op))
        self.K_a_IN =  10 ** -9.25 * np.exp((51965 / (100 * self.R)) * (1 / self.T_base - 1 / self.T_op))

        self.k_A_B_va =  10 ** 10
        self.k_A_B_bu =  10 ** 10
        self.k_A_B_pro =  10 ** 10
        self.k_A_B_ac =  10 ** 10
        self.k_A_B_co2 =  10 ** 10
        self.k_A_B_IN =  10 ** 10

        self.p_gas_h2o =  0.0313 * np.exp(5290 * (1 / self.T_base - 1 / self.T_op))
        self.k_p = 5 * 10 ** 4
        self.k_L_a =  200.0
        self.K_H_co2 =  0.035 * np.exp((-19410 / (100 * self.R))* (1 / self.T_base - 1 / self.T_op))
        self.K_H_ch4 =  0.0014 * np.exp((-14240 / (100 * self.R)) * (1 / self.T_base - 1 / self.T_op))
        self.K_H_h2 =  7.8 * 10 ** -4 * np.exp(-4180 / (100 * self.R) * (1 / self.T_base - 1 / self.T_op))

        self.S_nh4_ion = 0.0041
        self.S_co2 = 0.14
        self.K_pH_aa =  (10 ** (-1 * (self.pH_LL_aa + self.pH_UL_aa) / 2.0))
        self.nn_aa =  (3.0 / (self.pH_UL_aa - self.pH_LL_aa))
        self.K_pH_ac = (10 ** (-1 * (self.pH_LL_ac + self.pH_UL_ac) / 2.0))
        self.n_ac =  (3.0 / (self.pH_UL_ac - self.pH_LL_ac))
        self.K_pH_h2 =  (10 ** (-1 * (self.pH_LL_h2 + self.pH_UL_h2) / 2.0))
        self.n_h2 =  (3.0 / (self.pH_UL_h2 - self.pH_LL_h2))

        # self.pH = - np.log10(self.S_H_ion)
        # q_ad = 178.4674

    def get_state_input(self, user_input):

        ## Conversion de unidades y variables
        SV = user_input['SV']*10                            #kg SV m^-3     #Solidos volatiles
        Norg = user_input['Nt'] - user_input['Ni']          #kg m^-3        #Nitrogeno organico
        S_IN_in = user_input['Ni']/14                       #M N            #Nitrogeno amoniacal
        Alk_VFA = (user_input['At'] - user_input['Ap'])/50  #eq m^-3        #Alcalinidad de los AGV
        Shco3_in = user_input['Ap']/100                     #M C            #Concentracion de bicarbonato

        ## characterization of the influent using the methodology reported by Kleerebezem (2006)
        # composicion elemental del sustrato organico CxHyOzNu,v con x=1
        COT = (user_input['COD']*1000-49.2)/(3*1000)          #kg C m^-3
        COD_M = user_input['COD']/32                        #M 02
        COT_M = COT/12                                      #M C
        Norg_M = Norg/14                                    #M N
        y = (2*COD_M-Alk_VFA+2*Norg_M)/COT_M                #Coef. estequiometrico H
        z = 2-(COD_M+0.5*Norg_M)/COT_M                      #Coef. estequiometrico 0
        v = Norg_M/COT_M                                    #Coef. estequiometrico N
        u = -Alk_VFA/COT_M                                  #Carga

        # fraccion biodegradable de COD    
        COD_SV = user_input['COD']/SV                       #kg COD (kg SV)^-1   #radio DQO:Solidos volatiles
        fd = user_input['Bo']/(380*COD_SV)                  #Fraccion degradable
        fi = 1-fd                                           #Fraccion de inertes

        # fraccion de organicos degradables (base: moles de C) 
        N_VFA = u/self.Ch_VFA                               #Fraccion de AGV        #solo corresponde a acido acetico (Kleerebezem, 2006)
        N_pr = v/self.n_pr                                  #Fraccion de proteinas
        N_li = (y-2*z-3*v-u)/(self.Y_lip-4)                 #Fraccion de lipidos
        N_ch = 1-N_VFA-N_pr-N_li                            #Fraccion de carbohidratos

        # concentracion de organicos degradables (en equivalente de DQO)-sin considerar fd y fi  	
        DQO_VFA = COT_M*N_VFA*self.Y_VFA*32/4               #kg O2 m^-3
        DQO_pr = COT_M*N_pr*self.Y_pr*32/4                  #kg O2 m^-3
        DQO_li = COT_M*N_li*self.Y_lip*32/4                 #kg O2 m^-3
        DQO_ch = COT_M*N_ch*self.Y_ch*32/4                  #kg O2 m^-3

        # concentracion de organicos (en equivalente de DQO)-ajustados segun fd y fi
        DQO_inertes = fi*(DQO_VFA+DQO_pr+DQO_li+DQO_ch)     #g O2 L^-1                             
        DQO_VFA = fd*DQO_VFA                                #kg O2 m^-3
        DQO_pr = fd*DQO_pr                                  #kg O2 m^-3
        DQO_li = fd*DQO_li                                  #kg O2 m^-3
        DQO_ch = fd*DQO_ch                                  #kg O2 m^-3
        ratio = user_input['CODs']/user_input['COD']-DQO_VFA/(DQO_VFA+DQO_pr+DQO_li+DQO_ch)

        ## input variables definition based on Kleerebezem (2006)
        S_su_in = DQO_ch*ratio                              #kg COD.m^-3
        S_aa_in = DQO_pr*ratio                              #kg COD.m^-3
        S_fa_in = DQO_li*ratio                              #kg COD.m^-3
        S_ac_in = DQO_VFA                                   #kg COD.m^-3
        S_va_in = 0
        S_bu_in = 0
        S_pro_in = 0
        S_h2_in = 0
        S_ch4_in = 0   #kg COD.m^-3
        SH_ref = 10**(-user_input['pH_in'])
        S_IC_in = Shco3_in*(self.K_a_co2+SH_ref)/self.K_a_co2#kmole C.m^-3
        S_I_in = DQO_inertes*ratio                          #kg COD.m^-3
        X_ch_in = DQO_ch*(1-ratio)                          #kg COD.m^-3
        X_pr_in = DQO_pr*(1-ratio)                          #kg COD.m^-3
        X_li_in = DQO_li*(1-ratio)                          #kg COD.m^-3   
        X_xc_in = 0
        X_su_in = 0
        X_aa_in = 0
        X_fa_in = 0
        X_c4_in = 0
        X_pro_in = 0
        X_ac_in = 0
        X_h2_in = 0 #kg COD.m^-3
        X_I_in = DQO_inertes*(1-ratio)                      #kg COD.m^-3
        S_anion_in = 0.002                                  #kmole.m^-3
        Sapro_in = 0                                        #kgCOD m^-3         #Acido propanoico
        Sabu_in = 0                                         #kgCOD m^-3         #Acido butirico
        Sava_in = 0                                         #kgCOD m^-3         #Acido valerico
        Saac_in = S_ac_in*self.K_a_ac/(self.K_a_ac + SH_ref)#kgCOD m^-3         #Acido acetico                                  
        Snh3_in = self.K_a_IN*S_IN_in/(self.K_a_IN + SH_ref)#kmole N m^-3       #Amoniaco                            
        SIC_in = Shco3_in*(self.K_a_co2+SH_ref)/self.K_a_co2#kmole C m^-3       #Carbono inorganico soluble       
        te_ref = ((self.K_w*(10**-14))-SH_ref**2)/SH_ref
        S_cation_in = te_ref-((S_IN_in-Snh3_in) - Shco3_in - Saac_in/64 - Sapro_in/112 - Sabu_in/160 - Sava_in/208 - S_anion_in)

        while S_cation_in < 0 :
            S_anion_in = S_anion_in*1.2
            S_cation_in = te_ref-((S_IN_in - Snh3_in) - Shco3_in - Saac_in/64 - Sapro_in/112 - Sabu_in/160 - Sava_in/208 - S_anion_in)  #kmole.m^-3

        return S_su_in,S_aa_in,S_fa_in,S_va_in,S_bu_in,S_pro_in,S_ac_in,S_h2_in,S_ch4_in,S_IC_in,S_IN_in,S_I_in,X_xc_in,X_ch_in,X_pr_in,X_li_in,X_su_in,X_aa_in,X_fa_in,X_c4_in,X_pro_in,X_ac_in,X_h2_in,X_I_in,S_cation_in,S_anion_in
    
    def update_progress(self, result, url):
        if url:
            try:
                response = post(url, data=dumps(result))
            except Exception as e:
                # TODO: Should be handled by logging
                print(e)
                print('Error sending progress.')