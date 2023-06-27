from wrangling_service.core.schemas.BPCModel import Samples
from wrangling_service.core.schemas.Output import OutputModel
from wrangling_service.core.utils.xls import load_from_xls
from wrangling_service.core.utils.handler import BPCXMLHandler
from wrangling_service.core.utils.clustering import clusterData
from wrangling_service.core.exceptions.exception import BPCGlobalDataException, BPCRecordedDataException, BPCSamplesDataException, BPCParseException, ClusteringException
from collections import defaultdict
import numpy as np
import pandas as pd

class WranglingService():

    def __init__(self) -> None:
        pass

    def load_procycla_file(self, file_content):
        try:
            time, biogas = load_from_xls(file_content)
            substrates = []
            processed_data = pd.DataFrame()
            for substrate in biogas:
                column_values = np.array(substrate[1:])
                for idx, value in enumerate(column_values[1:]):
                    if value < column_values[idx]:
                        column_values[idx+1] = column_values[idx]
                processed_data[substrate[0]] = column_values

            for column in processed_data.columns:
                values = processed_data[column][processed_data[column].notna()].values.tolist()
                substrates.append({'name': column, 'values':values})

            result = OutputModel(time=time[1:], substrates=substrates)
            return result
        except:
            raise BPCParseException('Error processing procycla file format')


    def load_BPC_file(self, file):
        try:
            BPCHandler = BPCXMLHandler()
            BPCHandler.parseFromString(file.decode("utf-8"))
            samples_data = BPCHandler.getSamplesData()
            global_data = BPCHandler.getGlobalData()
            recorded_data = BPCHandler.getRecordedData()

            strings = samples_data['Name'].dropna()
            clusters = clusterData(strings)

            # if there is a empty space it got filled with the mean of the bounding values
            shifted_recorded_data1, shifted_recorded_data2 = recorded_data.shift(), recorded_data.shift(-1)
            recorded_data = recorded_data.fillna((shifted_recorded_data1 + shifted_recorded_data2) / 2)

            samples = []
            for i in range(len(strings)):
                values = recorded_data.iloc[:,int(samples_data["Flow Cell nr."].iloc[i])]
                last_idx = values.last_valid_index()
                values = values.loc[:last_idx]
                if values.isnull().values.any():
                    raise BPCRecordedDataException()

                data = {
                    "id": int(samples_data["Flow Cell nr."].iloc[i]),
                    "name": samples_data["Name"].iloc[i],
                    "substrate": float(samples_data["Substrate VS/COD amount [g]"].iloc[i]),
                    "values": values.to_list(),
                    "type": None,
                    "blank": None,
                    "cluster": clusters[int(samples_data["Flow Cell nr."].iloc[i])-1]
                }
                samples.append(data)

            return  Samples(time=recorded_data["Day"].to_list(), samples=samples)

        except (BPCSamplesDataException, BPCGlobalDataException, BPCRecordedDataException, BPCParseException, ClusteringException) as e:
            raise e
        except UnicodeError as e:
            raise Exception("Unable to read given file format")
        except Exception as e:
            raise Exception("Could not load BPC file")
        
    def process_BPC_file(self, samples_list):
        try:
            clusters = defaultdict(list)
            names = defaultdict(str)
            blanks = defaultdict(list)
            substrates_keys = []
            substrates_amount = defaultdict(int)

            processed_data = pd.DataFrame()

            for sample in samples_list.samples:
                names[sample.cluster] = names[sample.cluster]+"; "+sample.name
                blanks[sample.cluster].append(sample.blank)
                substrates_amount[sample.cluster] = sample.substrate
                if 'blank' in sample.type:
                    clusters[sample.cluster].append(sample.values)
                if 'substrate' in sample.type:
                    clusters[sample.cluster].append(sample.values)
                    substrates_keys.append(sample.cluster)
                if 'control' in sample.type:
                    clusters[sample.cluster].append(sample.values)

            for key in clusters.keys():
                clusters[key] = pd.DataFrame(clusters[key]).dropna(axis=1).mean(axis=0)

            for key in substrates_keys:
                subtract_result = np.subtract(clusters[key], clusters[blanks[key][0]])

                column_values = np.divide(subtract_result, substrates_amount[key])

                for idx, value in enumerate(column_values.values[1:]):
                    if value < column_values.values[idx]:
                        column_values.values[idx+1] = column_values.values[idx]
                processed_data[names[key]] = column_values

            substrates = []
            for column in processed_data.columns:
                values = processed_data[column][processed_data[column].notna()].values.tolist()
                substrates.append({'name': column, 'values':values})

            result = OutputModel(time=samples_list.time, substrates=substrates)
            return result
        except:
            raise BPCParseException('Error processing BPC file format')