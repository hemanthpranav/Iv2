document.addEventListener('DOMContentLoaded', function () {
  const xSelect = document.getElementById('x-select');
  const ySelect = document.getElementById('y-select');
  const colorSelect = document.getElementById('color-select');
  const sizeSelect = document.getElementById('size-select');
  const originFilter = document.getElementById('origin-filter');
  const chartContainer = document.getElementById('chart-container');

  let data = [];
  let numericCols = [];
  let categoricalCols = [];

  d3.csv('a1-cars.csv').then((csvData) => {
    data = csvData.map(d => {
      const parsed = {};
      for (const key in d) {
        const value = d[key];
        const num = +value;
        parsed[key] = isNaN(num) ? value : num;
      }
      return parsed;
    });

    // Detect column types
    const sample = data[0];
    for (const key in sample) {
      if (typeof sample[key] === 'number') numericCols.push(key);
      else categoricalCols.push(key);
    }

    // Populate dropdowns
    numericCols.forEach(col => {
      xSelect.add(new Option(col, col));
      ySelect.add(new Option(col, col));
      sizeSelect.add(new Option(col, col));
    });
    categoricalCols.forEach(col => {
      colorSelect.add(new Option(col, col));
    });

    const origins = Array.from(new Set(data.map(d => d.Origin)));
    originFilter.add(new Option("All", "All"));
    origins.forEach(origin => {
      originFilter.add(new Option(origin, origin));
    });

    renderScatter();
    renderBar();
  });

  xSelect.addEventListener('change', renderScatter);
  ySelect.addEventListener('change', renderScatter);
  colorSelect.addEventListener('change', renderScatter);
  sizeSelect.addEventListener('change', renderScatter);
  originFilter.addEventListener('change', () => {
    renderScatter();
    renderBar();
  });

  function renderScatter() {
    const xVar = xSelect.value;
    const yVar = ySelect.value;
    const colorVar = colorSelect.value;
    const sizeVar = sizeSelect.value;
    const filter = originFilter.value;

    const filtered = filter === "All" ? data : data.filter(d => d.Origin === filter);

    d3.select('#scatter-plot').remove();

    const width = 600, height = 400, margin = {top: 50, right: 50, bottom: 50, left: 50};
    const svg = d3.select(chartContainer)
      .append("svg")
      .attr("id", "scatter-plot")
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleLinear().domain(d3.extent(filtered, d => d[xVar])).nice().range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain(d3.extent(filtered, d => d[yVar])).nice().range([height - margin.bottom, margin.top]);
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const size = d3.scaleLinear().domain(d3.extent(filtered, d => d[sizeVar])).nice().range([5, 12]);

    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x));
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

    svg.append("text").attr("x", width / 2).attr("y", height - 10).attr("text-anchor", "middle").text(xVar);
    svg.append("text").attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", 15).attr("text-anchor", "middle").text(yVar);

    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "#f9f9f9")
      .style("padding", "8px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px");

    svg.selectAll("circle")
      .data(filtered)
      .enter()
      .append("circle")
      .attr("cx", d => x(d[xVar]))
      .attr("cy", d => y(d[yVar]))
      .attr("r", d => size(d[sizeVar]))
      .attr("fill", d => color(d[colorVar]))
      .attr("opacity", 0.7)
      .on("mouseover", (event, d) => {
        tooltip.html(`${xVar}: ${d[xVar]}<br>${yVar}: ${d[yVar]}<br>${colorVar}: ${d[colorVar]}<br>${sizeVar}: ${d[sizeVar]}`)
          .style("visibility", "visible")
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mousemove", (event) => {
        tooltip.style("top", `${event.pageY - 10}px`).style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));
  }

  function renderBar() {
    const filter = originFilter.value;
    const filtered = filter === "All" ? data : data.filter(d => d.Origin === filter);
    const counts = d3.rollup(filtered, v => v.length, d => d.Origin);
    const barData = Array.from(counts, ([origin, count]) => ({ origin, count }));

    d3.select('#bar-chart').remove();

    const width = 600, height = 400, margin = {top: 50, right: 50, bottom: 50, left: 50};
    const svg = d3.select(chartContainer)
      .append("svg")
      .attr("id", "bar-chart")
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleBand().domain(barData.map(d => d.origin)).range([margin.left, width - margin.right]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(barData, d => d.count)]).nice().range([height - margin.bottom, margin.top]);

    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x));
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

    svg.append("text").attr("x", width / 2).attr("y", height - 10).attr("text-anchor", "middle").text("Origin");
    svg.append("text").attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", 15).attr("text-anchor", "middle").text("Count");

    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "#f9f9f9")
      .style("padding", "8px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px");

    svg.selectAll("rect")
      .data(barData)
      .enter()
      .append("rect")
      .attr("x", d => x(d.origin))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - y(d.count))
      .attr("fill", "steelblue")
      .on("mouseover", (event, d) => {
        tooltip.html(`Origin: ${d.origin}<br>Count: ${d.count}`)
          .style("visibility", "visible")
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mousemove", (event) => {
        tooltip.style("top", `${event.pageY - 10}px`).style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));
  }
});
