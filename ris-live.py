import json
import sys
from datetime import datetime, timezone
import socket

import websocket
from dateutil import tz

asnum = arguments = sys.argv[1]

ws = websocket.WebSocket()
ws.connect("wss://ris-live.ripe.net/v1/ws/?client=py-example-1")
params = {
    "moreSpecific": True,
    "path": asnum,
    "host": None,
    "socketOptions": {"includeRaw": True},
}
ws.send(json.dumps({"type": "ris_subscribe", "data": params}))


def writefile():
    with open(asnum + ".json", "r") as the_file:
        lines = the_file.readlines()
        # lines = list(filter(lambda line: 'rrc00.ripe.net' in line, lines))
        out = ",".join(lines[len(lines) - 10000:])
        with open(asnum + ".js", "w") as js_file:
            js_file.write(f"load_js([{out}]);")


writefile()
for data in ws:

    with open(asnum + ".json", "a") as the_file:
        the_file.write(f"{data}\n")

    writefile()

    parsed = json.loads(data)

    # ris_message {
    #   'timestamp': 1678086179.61,
    #   'peer': '80.81.197.27',
    #   'peer_asn': '210937',
    #   'id': '80.81.197.27-0186b5bb0b1a0006',
    #   'host': 'rrc12.ripe.net',
    #   'type': 'UPDATE',
    #   'path': [210937, 6830, 2914, 3300],
    #   'community': [[2914, 410], [2914, 1001], [2914, 2000], [2914, 3000], [3300, 2], [3300, 1407], [3300, 1997], [3300, 3030], [3300, 3032], [6830, 17000], [6830, 17525], [6830, 23001], [6830, 33125]],
    #   'origin': 'IGP',
    #   'announcements': [{'next_hop': '80.81.197.27', 'prefixes': ['136.238.239.0/24']}],
    #   'withdrawals': [],
    #   'raw': 'FFF'}
    path = parsed["data"]["path"]

    t = (
        datetime.fromtimestamp(parsed["data"]["timestamp"], timezone.utc)
        .astimezone(tz.tzlocal())
        .strftime("%Y-%m-%dT%H:%M:%S")
    )
    aprefixes = [p["prefixes"] for p in parsed["data"]["announcements"]]
    aprefixes = [item for sublist in aprefixes for item in sublist]
    wprefixes = parsed["data"]["withdrawals"]
    print(
        parsed["type"],
        t,
        parsed["data"]["type"],
        path[len(path) - 1],
        aprefixes,
        wprefixes,
    )
