const datasets = {
  "Cars Dataset": "a1-cars.csv"
};
let rawData = [], filteredData = [];
let columns = [], numericCols = [], categoricalCols = [];
let xVar, yVar, colorVar, sizeVar;
const margin = {top:20, right:20, bottom:40, left:50};
const width  = 400 - margin.left - margin.right;
const height = 300 - margin.top - margin.bottom;

function init() {
  const dsSel = d3.select("#dataset-select")
    .on("change", () => loadDataset(dsSel.property("value")));
  Object.keys(datasets).forEach(name =>
    dsSel.append("option").text(name).attr("value", name)
  );
  loadDataset(Object.keys(datasets)[0]);
}
document.addEventListener("DOMContentLoaded", init);

function loadDataset(name) {
  d3.csv(datasets[name], d3.autoType).then(data => {
    rawData = data;
    columns = data.columns;
    numericCols = columns.filter(c => typeof data[0][c] === "number");
    categoricalCols = columns.filter(c => typeof data[0][c] === "string");
    setupVariableSelectors();
    setupFilters();
    xVar = numericCols[0];
    yVar = numericCols[1];
    colorVar = "";
    sizeVar = "";
    filteredData = rawData.slice();
    initCharts();
    updateAll();
  });
}

function setupVariableSelectors() {
  function bindOptions(selId, list, includeNone=false) {
    const sel = d3.select(selId).on("change", updateAll);
    sel.selectAll("option").remove();
    if(includeNone) sel.append("option").text("None").attr("value", "");
    list.forEach(v => sel.append("option").text(v).attr("value", v));
  }
  bindOptions("#x-axis-select", numericCols);
  bindOptions("#y-axis-select", numericCols);
  bindOptions("#color-by-select", categoricalCols, true);
  bindOptions("#size-by-select", numericCols, true);
}

function setupFilters() {
  const container = d3.select("#filters");
  container.selectAll("*").remove();
  categoricalCols.forEach(col => {
    const vals = Array.from(new Set(rawData.map(d => d[col])));
    const group = container.append("div").attr("class","filter-group");
    group.append("strong").text(col);
    vals.forEach(v => {
      const id = `filt-${col}-${v}`;
      group.append("input")
           .attr("type","checkbox")
           .attr("id",id)
           .attr("value",v)
           .property("checked", true)
           .on("change", () => {
             applyFilters();
             updateAll();
           });
      group.append("label")
           .attr("for",id)
           .text(v);
    });
  });
}

function applyFilters() {
  filteredData = rawData.filter(d => 
    categoricalCols.every(col => {
      const checked = Array.from(document.querySelectorAll(`#filters .filter-group input[id^="filt-${col}-"]:checked`))
                           .map(n => n.value);
      return checked.includes(d[col]);
    })
  );
}

function initCharts() {
  ["#scatter-plot-card", "#bar-chart-card", "#line-chart-card", "#data-table-card"]
    .forEach(id => {
      d3.select(id).append("svg")
        .attr("width", width+margin.left+margin.right)
        .attr("height", height+margin.top+margin.bottom)
      .append("g")
        .attr("transform",`translate(${margin.left},${margin.top})`);
    });
}

// Scatter, Bar, Line, Table update functions omitted for brevity
// Please copy the updateScatter, updateBar, updateLine, updateTable functions from the previous snippet here.
