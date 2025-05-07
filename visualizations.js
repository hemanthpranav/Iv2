// Map of dataset names to CSV paths
const datasets = {
  "Cars Dataset": "a1-cars.csv"
};

// Global data variables
let rawData = [], filteredData = [];
let columns = [], numericCols = [], categoricalCols = [];

// Margins and dimensions
const margin = {top: 20, right: 20, bottom: 40, left: 50};
const width  = 400 - margin.left - margin.right;
const height = 300 - margin.top - margin.bottom;

// Initialization
function init() {
  const dsSel = d3.select("#dataset-select")
    .on("change", () => loadDataset(dsSel.property("value")));

  // Populate dataset selector
  dsSel.selectAll("option")
    .data(Object.keys(datasets))
    .join("option")
      .attr("value", d => d)
      .text(d => d);

  // Load the first dataset by default
  loadDataset(Object.keys(datasets)[0]);
}
document.addEventListener("DOMContentLoaded", init);

// Load CSV, populate filters, and draw charts
function loadDataset(name) {
  d3.csv(datasets[name], d3.autoType).then(data => {
    rawData = data;
    filteredData = rawData.slice();

    columns = data.columns;
    numericCols = columns.filter(c => typeof data[0][c] === "number");
    categoricalCols = columns.filter(c => typeof data[0][c] === "string");

    // Populate sidebar filters
    const makes     = Array.from(new Set(rawData.map(d => d.Manufacturer))).sort();
    const origins   = Array.from(new Set(rawData.map(d => d.Origin))).sort();
    const cylinders = Array.from(new Set(rawData.map(d => d.Cylinders))).sort((a,b)=>a-b);

    populateSelect("#manufacturer-select", makes);
    populateSelect("#origin-select",     origins);
    populateSelect("#cylinders-select",  cylinders);

    // Attach filter handlers
    d3.selectAll("#manufacturer-select, #origin-select, #cylinders-select")
      .on("change", applyFiltersAndUpdate);

    d3.select("#reset-btn")
      .on("click", () => {
        d3.selectAll("#manufacturer-select, #origin-select, #cylinders-select")
          .property("value", "");
        applyFiltersAndUpdate();
      });

    // Initial chart containers and draw
    initCharts();
    applyFiltersAndUpdate();
  });
}

// Helper to populate a <select> with "All" + values
function populateSelect(selector, values) {
  const sel = d3.select(selector);
  sel.selectAll("option").remove();
  sel.append("option").attr("value", "").text("All");
  sel.selectAll("option.option-item")
     .data(values)
     .join("option")
       .attr("class","option-item")
       .attr("value", d => d)
       .text(d => d);
}

// Apply filters from sidebar and redraw all charts
function applyFiltersAndUpdate() {
  const selMake = d3.select("#manufacturer-select").property("value");
  const selOrig = d3.select("#origin-select").property("value");
  const selCyl  = d3.select("#cylinders-select").property("value");

  filteredData = rawData.filter(d =>
       (!selMake || d.Manufacturer === selMake)
    && (!selOrig || d.Origin       === selOrig)
    && (!selCyl  || String(d.Cylinders) === selCyl)
  );

  updateAll();
}

// Create SVG containers for each chart
function initCharts() {
  // Scatter → chart-fuel
  d3.select("#chart-fuel")
    .selectAll("svg")
    .data([null])
    .join("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .selectAll("g")
    .data([null])
    .join("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Bar → chart-hp-mpg
  d3.select("#chart-hp-mpg")
    .selectAll("svg")
    .data([null])
    .join("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .selectAll("g")
    .data([null])
    .join("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Line → chart-weight
  d3.select("#chart-weight")
    .selectAll("svg")
    .data([null])
    .join("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .selectAll("g")
    .data([null])
    .join("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
}

// Redraw all charts
function updateAll() {
  updateScatter(filteredData);
  updateBar(filteredData);
  updateLine(filteredData);
  updateTable(filteredData);
}

// Scatter plot → #chart-fuel
function updateScatter(data) {
  const svg = d3.select("#chart-fuel svg g");
  const xKey = d3.select("#x-axis-select").property("value") || "Horsepower";
  const yKey = d3.select("#y-axis-select").property("value") || "MPG";

  const x = d3.scaleLinear().domain(d3.extent(data,d=>d[xKey])).nice().range([0,width]);
  const y = d3.scaleLinear().domain(d3.extent(data,d=>d[yKey])).nice().range([height,0]);

  svg.selectAll(".axis").remove();
  svg.append("g").attr("class","axis x-axis").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x));
  svg.append("g").attr("class","axis y-axis").call(d3.axisLeft(y));

  const circles = svg.selectAll("circle").data(data);
  circles.join(
    enter => enter.append("circle")
                  .attr("cx", d=>x(d[xKey]))
                  .attr("cy", d=>y(d[yKey]))
                  .attr("r", 0)
                  .attr("fill", "#3498db")
                .transition().duration(500)
                  .attr("r", 5),
    update => update.transition().duration(500)
                    .attr("cx", d=>x(d[xKey]))
                    .attr("cy", d=>y(d[yKey]))
;,
    exit   => exit.transition().duration(500).attr("r",0).remove()
  );
}

// Bar chart → #chart-hp-mpg
function updateBar(data) {
  const svg = d3.select("#chart-hp-mpg svg g");
  const key = "Manufacturer";
  const counts = Array.from(d3.rollup(data, v=>v.length, d=>d[key]), ([k,v])=>({key:k,val:v}));

  const x = d3.scaleBand().domain(counts.map(d=>d.key)).range([0,width]).padding(0.1);
  const y = d3.scaleLinear().domain([0,d3.max(counts,d=>d.val)]).nice().range([height,0]);

  svg.selectAll(".axis").remove();
  svg.append("g").attr("class","axis x-axis").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x)).selectAll("text").attr("transform","rotate(-45)").style("text-anchor","end");
  svg.append("g").attr("class","axis y-axis").call(d3.axisLeft(y));

  const bars = svg.selectAll("rect").data(counts, d=>d.key);
  bars.join(
    enter => enter.append("rect")
                  .attr("x", d=>x(d.key))
                  .attr("y", height)
                  .attr("width", x.bandwidth())
                  .attr("height", 0)
                .transition().duration(500)
                  .attr("y", d=>y(d.val))
                  .attr("height", d=>height - y(d.val)),
    update => update.transition().duration(500)
                    .attr("y", d=>y(d.val))
                    .attr("height", d=>height - y(d.val)),
    exit   => exit.transition().duration(500).attr("height",0).attr("y",height).remove()
  );
}

// Line chart → #chart-weight
function updateLine(data) {
  const svg = d3.select("#chart-weight svg g");
  const xKey = "ModelYear";
  const yKey = "Weight";

  const sorted = data.slice().sort((a,b)=>a[xKey] - b[xKey]);
  const x = d3.scaleLinear().domain(d3.extent(sorted,d=>d[xKey])).range([0,width]);
  const y = d3.scaleLinear().domain(d3.extent(sorted,d=>d[yKey])).range([height,0]);

  svg.selectAll(".axis").remove();
  svg.append("g").attr("class","axis x-axis").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x));
  svg.append("g").attr("class","axis y-axis").call(d3.axisLeft(y));

  const lineGen = d3.line().x(d=>x(d[xKey])).y(d=>y(d[yKey]));
  const path = svg.selectAll("path").data([_sorted]);
  path.join(
    enter => enter.append("path")
                  .attr("d", lineGen)
                  .attr("fill", "none")
                  .attr("stroke", "#e74c3c")
                  .attr("stroke-width", 2)
                  .attr("stroke-opacity", 0)
                .transition().duration(500)
                  .attr("stroke-opacity", 1),
    update => update.transition().duration(500).attr("d", lineGen),
    exit   => exit.remove()
  );
}

// Data table (unchanged)
function updateTable(data) {
  const tbody = d3.select("#data-table tbody");
  const rows = tbody.selectAll("tr").data(data);
  const cols = columns;

  // enter
  const newRows = rows.enter().append("tr");
  newRows.selectAll("td")
         .data(d => cols.map(c => d[c]))
         .enter()
         .append("td")
         .text(d => d);

  // update
  rows.selectAll("td")
      .data(d => cols.map(c => d[c]))
      .text(d => d);

  // exit
  rows.exit().remove();
}
