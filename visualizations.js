document.addEventListener('DOMContentLoaded', () => {
  const manufacturerSelect = document.getElementById('manufacturer-select');
  const originSelect = document.getElementById('origin-select');
  const cylindersSelect = document.getElementById('cylinders-select');
  const resetBtn = document.getElementById('reset-btn');

  let rawData = [];

  d3.csv("a1-cars.csv").then(data => {
    // Convert numeric fields
    rawData = data.map(d => {
      for (let key in d) {
        const num = +d[key];
        d[key] = isNaN(num) ? d[key] : num;
      }
      return d;
    });

    populateFilters();
    updateCharts();

    manufacturerSelect.addEventListener('change', updateCharts);
    originSelect.addEventListener('change', updateCharts);
    cylindersSelect.addEventListener('change', updateCharts);
    resetBtn.addEventListener('click', () => {
      manufacturerSelect.selectedIndex = 0;
      originSelect.selectedIndex = 0;
      cylindersSelect.selectedIndex = 0;
      updateCharts();
    });
  });

  function populateFilters() {
    const unique = (key) => [...new Set(rawData.map(d => d[key]))].sort();

    for (const val of unique("Manufacturer")) {
      manufacturerSelect.add(new Option(val, val));
    }

    for (const val of unique("Origin")) {
      originSelect.add(new Option(val, val));
    }

    for (const val of unique("Cylinders")) {
      cylindersSelect.add(new Option(val, val));
    }
  }

  function getFilteredData() {
    const manufacturer = manufacturerSelect.value;
    const origin = originSelect.value;
    const cylinders = cylindersSelect.value;

    return rawData.filter(d =>
      (!manufacturer || d.Manufacturer === manufacturer) &&
      (!origin || d.Origin === origin) &&
      (!cylinders || d.Cylinders == cylinders)
    );
  }

  function updateCharts() {
    const data = getFilteredData();
    renderScatterPlot(data);
    renderBarChart(data);
  }

  function renderScatterPlot(data) {
    d3.select('#chart-hp-mpg').selectAll("*").remove();

    const width = 500, height = 350, margin = { top: 40, right: 30, bottom: 50, left: 60 };

    const svg = d3.select('#chart-hp-mpg')
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.Horsepower)).nice()
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain(d3.extent(data, d => d.MPG)).nice()
      .range([height - margin.bottom, margin.top]);

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    // Axis labels
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

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "#f9f9f9")
      .style("padding", "8px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px");

    svg.selectAll("circle")
      .data(data)
      .join("circle")
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
        tooltip.style("top", `${event.pageY - 10}px`).style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));
  }

  function renderBarChart(data) {
    d3.select('#chart-weight').selectAll("*").remove();

    const width = 500, height = 350, margin = { top: 40, right: 30, bottom: 50, left: 60 };

    const grouped = d3.rollup(
      data,
      v => d3.mean(v, d => d.Weight),
      d => d.Origin
    );

    const barData = Array.from(grouped, ([Origin, Weight]) => ({ Origin, Weight }));

    const x = d3.scaleBand()
      .domain(barData.map(d => d.Origin))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, d3.max(barData, d => d.Weight)]).nice()
      .range([height - margin.bottom, margin.top]);

    const svg = d3.select('#chart-weight')
      .append("svg")
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
      .join("rect")
      .attr("x", d => x(d.Origin))
      .attr("y", d => y(d.Weight))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - y(d.Weight))
      .attr("fill", "teal")
      .on("mouseover", (event, d) => {
        tooltip.html(`Origin: ${d.Origin}<br>Avg Weight: ${d.Weight.toFixed(1)}`)
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

