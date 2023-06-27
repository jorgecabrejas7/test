import numpy as np
import distance
from wrangling_service.core.exceptions.exception import ClusteringException

def get_closest_indices(indices, idx):
    result = idx-indices
    result = np.abs(result)

    idxs = np.argpartition(result, len(indices)-1)
    result = np.take(indices, idxs)
    return result[0:3]

def clusterData(strings:str):
    try:
        strings = [s.strip().lower().replace(" ", "") for s in strings]
        strings_length = len(strings)
        original = strings.copy()
        strings.sort()

        lev_similarity = 1+np.array([[distance.levenshtein(w1,w2) for w1 in strings] for w2 in strings]).astype(float)
        clusters = np.zeros(len(strings))
        actual_cluster = 1
        for idx, row in enumerate(lev_similarity):
            smallest_value = min(row)
            ocurrences = np.count_nonzero(row == smallest_value)
            if ocurrences == 1:
                removed = row[row != smallest_value]
                actual_smallest_value = min(removed)
                diff = actual_smallest_value - smallest_value
                if diff>2:
                    clusters[idx] = actual_cluster
                    actual_cluster += 1
                    continue
                else:
                    smallest_value = actual_smallest_value
            
            indices = np.where(np.logical_or(row == smallest_value, row == 1))[0]

            result = get_closest_indices(indices, idx)
            np.put(clusters, result, actual_cluster)
            actual_cluster += 1
        final_result = np.zeros(strings_length)
        values = np.unique(clusters)
        for idx, i in enumerate(clusters):
            if i in values:
                final_result[idx] = np.where(values == i)[0]

        clusters = final_result.copy()
        final_result = np.zeros(strings_length)

        for idx, i in enumerate(strings):
            vec_func = np.vectorize(lambda x: i in x)
            indices = np.where(vec_func(original))
            values = np.take(clusters, idx)
            np.put(final_result, indices, values)

        clusters = final_result.astype(np.uint8).tolist()
        return clusters
    except Exception:
        raise ClusteringException(strings)