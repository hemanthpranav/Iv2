document.addEventListener('DOMContentLoaded', () => {
  const manufacturerSelect = document.getElementById('manufacturer-select');
  const originSelect = document.getElementById('origin-select');
  const cylindersSelect = document.getElementById('cylinders-select');
  const resetBtn = document.getElementById('reset-btn');

  let rawData = [];

  d3.csv("a1-cars.csv").then(data => {
    rawData = data.map(d => {
      for (let key in d) {
        const num = +d[key];
        d[key] = isNaN(num) ? d[key] : num;
      }
      return d;
    });

    populateFilters();
    resetFilters();
    updateAllCharts();

    manufacturerSelect.addEventListener('change', updateAllCharts);
    originSelect.addEventListener('change', updateAllCharts);
    cylindersSelect.addEventListener('change', updateAllCharts);
    resetBtn.addEventListener('click', () => {
      resetFilters();
      updateAllCharts();
    });
  });

  function populateFilters() {
    const unique = key => [...new Set(rawData.map(d => d[key]))].sort();

    manufacturerSelect.add(new Option("All", ""));
    unique("Manufacturer").forEach(val =>
      manufacturerSelect.add(new Option(val, val))
    );

    originSelect.add(new Option("All", ""));
    unique("Origin").forEach(val =>
      originSelect.add(new Option(val, val))
    );

    cylindersSelect.add(new Option("All", ""));
    unique("Cylinders").forEach(val =>
      cylindersSelect.add(new Option(val, val))
    );
  }

  function resetFilters() {
    manufacturerSelect.value = "";
    originSelect.value = "";
    cylindersSelect.value = "";
  }

  function getFilteredData() {
    const m = manufacturerSelect.value;
    const o = originSelect.value;
    const c = cylindersSelect.value;

    return rawData.filter(d =>
      (!m || d.Manufacturer === m) &&
      (!o || d.Origin === o) &&
      (!c || d.Cylinders == c)
    );
  }

  function updateAllCharts() {
    const data = getFilteredData();
    renderFuelChart(data);
    renderScatter(data);
    renderBar(data);
  }

  function renderFuelChart(data) {
    const container = d3.select('#chart-fuel');
    container.selectAll("*").remove();

    if (data.length === 0) {
      container.append("p")
        .text("No data available for selected filters.")
        .style("color", "red")
        .style("font-weight", "bold")
        .style("padding", "1rem");
      return;
    }

    const width = 500, height = 350, margin = { top: 40, right: 30, bottom: 50, left: 60 };

    const grouped = d3.rollup(data, v => d3.mean(v, d => d.MPG), d => d.Manufacturer);
    const barData = Array.from(grouped, ([Manufacturer, MPG]) => ({ Manufacturer, MPG }));

    const x = d3.scaleBand()
      .domain(barData.map(d => d.Manufacturer))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(barData, d => d.MPG)]).nice()
      .range([height - margin.bottom, margin.top]);

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height);

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 5)
      .attr("text-anchor", "middle")
      .text("Manufacturer");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .text("Average MPG");

    const tooltip = createTooltip();

    svg.selectAll("rect")
      .data(barData)
      .enter()
      .append("rect")
      .attr("x", d => x(d.Manufacturer))
      .attr("y", d => y(d.MPG))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - y(d.MPG))
      .attr("fill", "orange")
      .on("mouseover", (event, d) => {
        tooltip.html(`Manufacturer: ${d.Manufacturer}<br>MPG: ${d.MPG.toFixed(1)}`)
          .style("visibility", "visible")
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mousemove", (event) => {
        tooltip.style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));
  }

  function renderScatter(data) {
    const container = d3.select('#chart-hp-mpg');
    container.selectAll("*").remove();

    if (data.length === 0) {
      container.append("p")
        .text("No data available for selected filters.")
        .style("color", "red")
        .style("font-weight", "bold")
        .style("padding", "1rem");
      return;
    }

    const width = 500, height = 350, margin = { top: 40, right: 30, bottom: 50, left: 60 };

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.Horsepower)).nice()
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain(d3.extent(data, d => d.MPG)).nice()
      .range([height - margin.bottom, margin.top]);

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height);

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 5)
      .attr("text-anchor", "middle")
      .text("Horsepower");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .text("MPG");

    const tooltip = createTooltip();

    svg.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.Horsepower))
      .attr("cy", d => y(d.MPG))
      .attr("r", 5)
      .attr("fill", "steelblue")
      .attr("opacity", 0.7)
      .on("mouseover", (event, d) => {
        tooltip.html(`Horsepower: ${d.Horsepower}<br>MPG: ${d.MPG}`)
          .style("visibility", "visible")
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mousemove", (event) => {
        tooltip.style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));
  }

  function renderBar(data) {
    const container = d3.select('#chart-weight');
    container.selectAll("*").remove();

    if (data.length === 0) {
      container.append("p")
        .text("No data available for selected filters.")
        .style("color", "red")
        .style("font-weight", "bold")
        .style("padding", "1rem");
      return;
    }

    const width = 500, height = 350, margin = { top: 40, right: 30, bottom: 50, left: 60 };

    const grouped = d3.rollup(data, v => d3.mean(v, d => d.Weight), d => d.Origin);
    const barData = Array.from(grouped, ([Origin, Weight]) => ({ Origin, Weight }));

    const x = d3.scaleBand()
      .domain(barData.map(d => d.Origin))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(barData, d => d.Weight)]).nice()
      .range([height - margin.bottom, margin.top]);

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height);

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 5)
      .attr("text-anchor", "middle")
      .text("Origin");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .text("Average Weight");

    const tooltip = createTooltip();

    svg.selectAll("rect")
      .data(barData)
      .enter()
      .append("rect")
      .attr("x", d => x(d.Origin))
      .attr("y", d => y(d.Weight))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - y(d.Weight))
      .attr("fill", "teal")
      .on("mouseover", (event, d) => {
        tooltip.html(`Origin: ${d.Origin}<br>Weight: ${d.Weight.toFixed(1)}`)
          .style("visibility", "visible")
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mousemove", (event) => {
        tooltip.style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));
  }

  function createTooltip() {
    return d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "#f9f9f9")
      .style("padding", "8px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px");
  }
});
