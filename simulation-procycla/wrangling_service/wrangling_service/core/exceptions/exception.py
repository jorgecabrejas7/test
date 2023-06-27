class BPCGlobalDataException(Exception):
     def __init__(self, list, list2):
        message = 'BPC global data should contain the following fields: {}. Values found: {}'.format(list, list2)
        super().__init__(message)

class BPCSamplesDataException(Exception):
     def __init__(self, list, list2):
        message = 'BPC samples data should contain the following fields: {}. Values found: {}'.format(list, list2)
        super().__init__(message)

class BPCRecordedDataException(Exception):
     def __init__(self):
        message = 'BPC recorded data could not be read'
        super().__init__(message)

class BPCParseException(Exception):
     def __init__(self, message):
        super().__init__(message)

class ClusteringException(Exception):
    def __init__(self, list):
        message = 'Could not cluster the given sample names: {}'.format(list)
        super().__init__(message)