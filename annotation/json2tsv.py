import json
import sys

filename = sys.argv[1]
json_open = open(filename, 'r')
json_load = json.load(json_open)
for k in json_load.keys():
    for v in json_load[k]:
        print("\t".join((k,v)))

