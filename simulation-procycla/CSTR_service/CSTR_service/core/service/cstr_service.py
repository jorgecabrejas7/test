
import pandas as pd
from fastapi import Depends
from CSTR_service.core.settings import settings
from CSTR_service.core.simulation.ADM1 import ADM1
from CSTR_service.core.schemas.uncertainty import UncertaintyResult
from CSTR_service.core.schemas.cstr_result import CSTRResult, ResultDict
from CSTR_service.core.exceptions.cstr_exception import CSTRException

def full_stack():
    import traceback, sys
    exc = sys.exc_info()[0]
    stack = traceback.extract_stack()[:-1]  # last one would be full_stack()
    if exc is not None:  # i.e. an exception is present
        del stack[-1]       # remove call of full_stack, the printed exception
                            # will contain the caught exception caller instead
    trc = 'Traceback (most recent call last):\n'
    stackstr = trc + ''.join(traceback.format_list(stack))
    if exc is not None:
         stackstr += '  ' + traceback.format_exc().lstrip(trc)
    return stackstr

class CSTRService:

    def  __init__(self, adm1: ADM1 = Depends(ADM1)):
        self.adm1 = adm1
        self.pc_biogas_inf = float(settings.config.get('energy', 'pc-biogas-inf'))
        self.r_chp_caldera = float(settings.config.get('energy', 'r-chp-caldera'))
        self.r_chp_motor = float(settings.config.get('energy', 'r-chp-motor'))

    def run_adm1(self, user_input):
        try:
            user_input = self.get_delta(user_input)
            result = self.adm1.dynamic_simulation(user_input=user_input)
            results_list = []
            for key, value in result['result'].items():
                results_list.append(ResultDict(name=key, value=value))
                if key == 'gasflow':
                    results_list.append(ResultDict(name='energy', value=self.get_energy(value)))
            
            return CSTRResult(status_code=result['status_code'], execution_days=result['days_simulated'], trh=result['trh'], results=results_list)
        except CSTRException as e:
            print(full_stack())
            raise CSTRException(e)
        except Exception as e:
            print(full_stack())
            raise CSTRException("CSTR module failed for given data: {}".format(user_input))
        
    def propagate_uncertainty(self, user_input):
        try:
            result = self.adm1.propagate_uncertainty(user_input=user_input)
            return UncertaintyResult.parse_obj(result)
        except Exception as e:
            print(full_stack())
            raise CSTRException("CSTR module failed propagating uncertainty for given data: {}".format(user_input))

    def get_delta(self, user_input):
        uncertainty = user_input['uncertainty']
        if uncertainty == 'off':
            pass
        elif uncertainty == 'bo':
            user_input['Bo'] += float(settings.config.get('uncertainty', "Bo"))
        elif uncertainty == 'kh':
            user_input['Kh'] += float(settings.config.get('uncertainty', "Kh"))
        else:
            raise CSTRException("Uncertainty values are off | bo | kh. Given value is: {}".format(uncertainty))

        return user_input

    def get_energy(self, gasflow):
        EBG = pd.Series(gasflow['q_gas'])*365*self.pc_biogas_inf
        ETG = EBG*self.r_chp_caldera
        EEG = EBG*self.r_chp_motor

        return {'EBG': EBG, 'ETG': ETG, 'EEG': EEG}