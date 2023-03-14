import { get, set } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";

const prefixMap = new Map();
const upstreamMap = new Map();
const tbody = document.getElementById("tbody");
const asnr = 200020; //43366;//13335; //; //1299;

function processEvent(evt) {
  const pathIDX = evt.data.path.indexOf(asnr);
  if (evt.data.path[evt.data.path.length - 1] == asnr) {
    // Discard events with a path that ends with asnr
    return false;
  }
  console.log(evt.data.path);

  const d = new Date(evt.data.timestamp * 1000);
  if (new Date() - d > 1000 * 12 * 3600) {
    // Discard old events
    return false;
  }

  const dstAS = evt.data.path[evt.data.path.length - 1];
  const upstreamAS = evt.data.path[pathIDX - 1];

  let prefixes = [];
  evt.data.announcements.reduce((f, i) => {
    return f.push(...i.prefixes);
  }, prefixes);

  let changes = false;
  prefixes
    .filter((prefix) => {
      // Discard ipv6
      return true;
      return !prefix.match(/^[0-9a-f:]+\/[0-9]+$/i);
    })
    .forEach((prefix) => {
      if (!prefixMap.has(prefix)) {
        prefixMap.set(prefix, { AS: dstAS, timestamps: [] });
        upstreamMap.set(prefix, new Set());
      }
      prefixMap.get(prefix).timestamps.push(d);
      upstreamMap.get(prefix).add(upstreamAS);
      changes = true;
    });
  return changes;
}

function createRow(prefix, value) {
  let row = document.createElement("tr");
  if (upstreamMap.get(prefix).size <= 3) {
    // Discard prefixes with a single upstream
    return;
  }
  let firstDateTD = document.createElement("td");
  row.appendChild(firstDateTD);
  firstDateTD.textContent = value.timestamps[0].toLocaleTimeString();

  let lastDateTD = document.createElement("td");
  row.appendChild(lastDateTD);
  lastDateTD.textContent = value.timestamps.at(-1).toLocaleTimeString();

  let countTD = document.createElement("td");
  row.appendChild(countTD);
  countTD.textContent =
    value.timestamps.length + "/" + upstreamMap.get(prefix).size;

  let asTD = document.createElement("td");
  row.appendChild(asTD);
  asTD.textContent = value.AS;

  let prefixTD = document.createElement("td");
  row.appendChild(prefixTD);
  prefixTD.textContent = prefix;
  tbody.appendChild(row);

  get("AS" + value.AS).then((name) => {
    if (name) {
      asTD.textContent = asTD.textContent + " " + name;
    } else {
      let cbname = "cb_" + Math.floor(Math.random() * 100000000).toString(36);
      window[cbname] = function (data) {
        asTD.textContent = asTD.textContent + " " + data.data.names[value.AS];
        set("AS" + value.AS, data.data.names[value.AS]);
      };
      let s = document.createElement("script");
      s.src = `https://stat.ripe.net/data/as-names/data.json?resource=${value.AS}&callback=${cbname}`;
      document.body.appendChild(s);
    }
  });
}

function repaint() {
  let elems = [...prefixMap.entries()];
  elems.sort((a, b) => {
    return b[1].timestamps.at(-1) - a[1].timestamps.at(-1);
  });

  while (tbody.firstChild) {
    tbody.removeChild(tbody.lastChild);
  }
  elems.forEach((e) => {
    createRow(e[0], e[1]);
  });
}

window["load_js"] = function (events) {
  prefixMap.clear();
  upstreamMap.clear();
  events.forEach(processEvent);
  repaint();
};

let s = document.createElement("script");
s.src = `${asnr}.js`;
document.body.appendChild(s);

var ws = new WebSocket("wss://ris-live.ripe.net/v1/ws/?client=nbip-monitor-1");
var params = {
  moreSpecific: true,
  path: "" + asnr,
  // host: "rrc00.ripe.net",
  socketOptions: {
    includeRaw: true,
  },
};
ws.onmessage = function (event) {
  var message = JSON.parse(event.data);
  console.log(message.type, message.data);
  if (processEvent(message)) {
    repaint();
  }
};
ws.onopen = function () {
  ws.send(
    JSON.stringify({
      type: "ris_subscribe",
      data: params,
    })
  );
};
