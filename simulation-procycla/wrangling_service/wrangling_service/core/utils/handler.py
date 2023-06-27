from xml.sax import ContentHandler, parse, parseString, SAXException
from wrangling_service.core.exceptions.exception import BPCGlobalDataException, BPCSamplesDataException, BPCRecordedDataException, BPCParseException
import numpy as np
import pandas as pd

class BPCXMLHandler(ContentHandler):

    def __init__(self):
        self.tables = []
        self.chars = []
        self.indexes = []
        self.counter = 0
        self.globalData = None
        self.samplesData = None
        self.recordedData = None

    def characters(self, content):
        self.chars.append(content)

    def startElement(self, name, attrs):
        if name == "Table":
            self.rows = []
        elif name == "Row":
            self.cells = []
            self.indexes = []
            self.counter = 0
        elif name == "Cell":
            try:
                index = attrs["ss:Index"]
                self.indexes.append(int(index))
            except:
                self.indexes.append(-1)
            self.chars = []

    def endElement(self, name):
        if name == "Table":
            self.tables.append(self.rows)
        elif name == "Row":
            self.rows.append(self.cells)
        elif name == "Cell":
            if self.indexes[self.counter] == -1:
                self.cells.append("".join(self.chars))
            else:
                refill = self.indexes[self.counter]-len(self.cells)
                aux = [np.nan]*(refill-1)
                self.cells[self.indexes[self.counter]:self.indexes[self.counter]] = aux
                self.cells.insert(self.indexes[self.counter], "".join(self.chars))
            self.counter += 1

    def parseFromString(self, file_string):
        try:
            parseString(file_string, self)
            self.tables[0] = [i for i in self.tables[0] if len(i) > 0]
        except SAXException:
            raise BPCParseException("Unable to parse file as XML")
    
    def parseFromFile(self, file_dir):
        parse(file_dir, self)

    def getData(self, range):
        data = pd.DataFrame(self.tables[0][range[0]:range[1]])
        data.replace('', np.nan, inplace=True)
        data = data.dropna(axis=1,how='all')
        data = data.T
        data.columns = data.iloc[0]
        data = data.drop([0])
        return data

    def getGlobalData(self):
        try:
            if self.globalData == None:
                self.globalData = self.getData((0,6))

            values = ['CO2 concentration [%] of flush gas', 'Process temperature [Celsius]', 'Mixer on time [sec]', 'Mixer off time [sec]', 'Mixer speed adjustment [%]', 'Eliminate overestimation']
            if not all(elem in values for elem in self.globalData.columns.values):
                raise BPCGlobalDataException(values, self.globalData.columns.values)
            return self.globalData
        except Exception:
            raise BPCGlobalDataException(values, self.globalData.columns.values)

    def getSamplesData(self):
        try:
            if self.samplesData == None:
                self.samplesData = self.getData((6,13))
            
            values = ['Flow Cell nr.', 'Name', 'Substrate VS/COD amount [g]', 'Inoculum VS/COD amount [g]', 'Type of unit [VS/COD]', 'Headspace volume [ml]', 'Assumed CH4 content [%]']
            if not all(elem in values for elem in self.samplesData.columns.values):
                raise BPCSamplesDataException(values, self.samplesData.columns.values)
            return self.samplesData
        except Exception:
            raise BPCSamplesDataException(values, self.samplesData.columns.values)

    def getRecordedData(self):
        try:
            if self.recordedData == None:
                data = pd.DataFrame(self.tables[0][13:])
                data.replace('', np.nan, inplace=True)
                data = data.dropna(axis=1,how='all')
                num_samples = len(data.iloc[0])-1
                data.columns = data.iloc[0]
                data = data.drop([0])
                data = data.astype(float)

                if 'Hour' in data.columns:
                    data['Hour'] = data["Hour"]/24
                    data.columns = ['Day' if x=='Hour' else x for x in data.columns]

                self.recordedData = data.iloc[:, 0:int((num_samples/2)+1)]
            return self.recordedData
        except Exception:
            raise BPCRecordedDataException()