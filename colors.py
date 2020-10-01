#!/usr/bin/env python3

import sys

for i in range(0, 16):
    for j in range(0, 16):
        code = str(i * 16 + j)
        sys.stdout.write(u"\u001b[38;5;" + code + "m " + code.ljust(4))
    print(u"\u001b[0m")

print(u"\033[90;1m Information")
print(u"\033[34;1m Low")
print(u"\033[33;1m Medium")
print(u"\033[31;1m High")


for color in (30, 31, 32, 33, 34, 35, 36, 37):
    print(f"\u001b[{color};1m {color}")

sys.exit(1)
