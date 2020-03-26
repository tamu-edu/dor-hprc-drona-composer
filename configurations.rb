# Dirty hack here. Assume we don't have lots of clusters

class Configuration
    cluster_name = "Terra"

    def machine_name
        cluster_name
    end
    

