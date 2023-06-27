import numpy as np

class PO():

    def __init__(self):
        self.initial_values = [300.0, 0.5]

    def function(self, x, a, b):
        return a*(1-np.exp(-b*x))

    def derivate_a(self, x, a, b):
        return (1-np.exp(-b*x))

    def derivate_b(self, x, a, b):
        return a*x*np.exp(-b*x)