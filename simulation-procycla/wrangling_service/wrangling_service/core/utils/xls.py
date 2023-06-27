import xlrd

def load_from_xls(file_content):
    # open excel file
    fileA = xlrd.open_workbook(file_contents=file_content)
    DataA = fileA.sheet_by_index(0)
    biogas = []
    # loop through columns
    for c in range(DataA.ncols):
        # Get time data without the header
        if (c == 0):
            time = []
            for t in (DataA.col(c))[1:]:
                time += [t.value]
        # Get the biogas values
        else:
            data_set = []
            for data in DataA.col(c):
                data_set += [data.value]
            biogas += [data_set]
    return time, biogas