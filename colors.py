#!/usr/bin/env python3

import sys

for i in range(0, 16):
    for j in range(0, 16):
        code = str(i * 16 + j)
        sys.stdout.write(u"\u001b[38;5;" + code + "m " + code.ljust(4))
    print(u"\u001b[0m")

print(u"\033[90m;1 Information")
print(u"\033[34m;1 Low")
print(u"\033[33m;1 Medium")
print(u"\033[31m;1 High")

sys.exit(1)
