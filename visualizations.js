class CarVisualization {
    constructor() {
        this.width = 350; // Reduced to fit 3 columns
        this.height = 250; // Matches container height
        this.margin = {top: 20, right: 20, bottom: 40, left: 50};
        
        this.data = [];
        this.filters = {
            manufacturer: 'all',
            origin: 'all',
            cylinders: 'all'
        };
        this.selectedPoints = new Set();
        this.persistentLabels = {
            barChart: null,
            scatterPlot: null,
            weightDistribution: null
        };
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.initControls();
        
        // Create tooltip div
        this.tooltip = d3.select("body")
          .append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("padding", "6px 10px")
          .style("background", "rgba(0, 0, 0, 0.7)")
          .style("color", "#fff")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("opacity", 0);

        this.createVisualizations();
    }

    async loadData() {
        try {
            const raw = await d3.csv("https://raw.githubusercontent.com/hemanthpranav/IV/main/a1-cars.csv");
            this.data = raw.map(d => ({
                Car: d.Car,
                Manufacturer: d.Manufacturer,
                MPG: +d.MPG || null,
                Horsepower: +d.Horsepower || null,
                Weight: +d.Weight || null,
                Acceleration: +d.Acceleration || null,
                Cylinders: +d.Cylinders || null,
                Origin: d.Origin,
                Displacement: +d.Displacement || null
            })).filter(d => d.MPG && d.Horsepower && d.Weight && d.Acceleration);
            
            this.updateVisualizations();
        } catch (error) {
            console.error("Data loading failed:", error);
            d3.select("#bar-chart").html('<p class="error">Error loading data. Please try again.</p>');
        }
    }

    initControls() {
        // Manufacturer filter
        const manufacturers = [...new Set(this.data.map(d => d.Manufacturer))].sort();
        d3.select("#manufacturer-filter")
            .selectAll("option")
            .data(["all", ...manufacturers])
            .join("option")
            .attr("value", d => d)
            .text(d => d === "all" ? "All Manufacturers" : d);

        // Origin filter
        const origins = [...new Set(this.data.map(d => d.Origin))].sort();
        d3.select("#origin-filter")
            .selectAll("option")
            .data(["all", ...origins])
            .join("option")
            .attr("value", d => d)
            .text(d => d === "all" ? "All Origins" : d);

        // Cylinders filter
        const cylinders = [...new Set(this.data.map(d => d.Cylinders))].sort((a,b) => a - b);
        d3.select("#cylinders-filter")
            .selectAll("option")
            .data(["all", ...cylinders])
            .join("option")
            .attr("value", d => d)
            .text(d => d === "all" ? "All Cylinders" : `${d} cylinders`);

        // Event listeners
        d3.selectAll(".filter").on("change", () => this.applyFilters());
        d3.select("#reset-btn").on("click", () => this.resetFilters());
    }

    applyFilters() {
        this.filters = {
            manufacturer: d3.select("#manufacturer-filter").property("value"),
            origin: d3.select("#origin-filter").property("value"),
            cylinders: d3.select("#cylinders-filter").property("value")
        };
        this.updateVisualizations();
    }

    resetFilters() {
        d3.selectAll(".filter").property("value", "all");
        this.filters = { manufacturer: 'all', origin: 'all', cylinders: 'all' };
        this.selectedPoints.clear();
        this.persistentLabels = {
            barChart: null,
            scatterPlot: null,
            weightDistribution: null
        };
        this.updateVisualizations();
    }

    updateVisualizations() {
        let filtered = this.data.filter(d => 
            (this.filters.manufacturer === "all" || d.Manufacturer === this.filters.manufacturer) &&
            (this.filters.origin === "all" || d.Origin === this.filters.origin) &&
            (this.filters.cylinders === "all" || d.Cylinders == this.filters.cylinders)
        );

        if (this.selectedPoints.size > 0) {
            filtered = filtered.filter(d => this.selectedPoints.has(d.Car));
        }

        this.renderBarChart(filtered);
        this.renderScatterPlot(filtered);
        this.renderWeightDistribution(filtered);
    }

    renderBarChart(data) {
        const container = d3.select("#bar-chart");
        container.selectAll("*").remove();
        
        const svg = container.append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Calculate average MPG by manufacturer
        const avgMPG = d3.rollups(
            data,
            v => d3.mean(v, d => d.MPG),
            d => d.Manufacturer
        ).map(([Manufacturer, MPG]) => ({ Manufacturer, MPG }));

        // Sort by MPG by default
        avgMPG.sort((a,b) => b.MPG - a.MPG);

        // Create scales
        const x = d3.scaleLinear()
            .domain([0, d3.max(avgMPG, d => d.MPG)]).nice()
            .range([0, this.width]);

        const y = d3.scaleBand()
            .domain(avgMPG.map(d => d.Manufacturer))
            .range([0, this.height])
            .padding(0.2);

        // Add bars
        svg.selectAll(".bar")
            .data(avgMPG)
            .join("rect")
            .attr("class", "bar data-point")
            .attr("x", 0)
            .attr("y", d => y(d.Manufacturer))
            .attr("width", d => x(d.MPG))
            .attr("height", y.bandwidth())
            .attr("fill", "steelblue")
            .classed("highlighted", d => 
                this.selectedPoints.size > 0 && 
                data.some(car => car.Manufacturer === d.Manufacturer && this.selectedPoints.has(car.Car)))
            .on("click", (event, d) => {
                this.selectedPoints = new Set(
                    this.data.filter(car => car.Manufacturer === d.Manufacturer).map(c => c.Car)
                );
                this.persistentLabels.barChart = {
                    text: `${d.Manufacturer}: ${d.MPG.toFixed(1)} MPG`,
                    x: x(d.MPG) + 10,
                    y: y(d.Manufacturer) + y.bandwidth() / 2 + 5
                };
                this.updateVisualizations();
            })
            .on("mouseover", (event, d) => {
                this.tooltip
                    .style("opacity", 1)
                    .html(`<strong>${d.Manufacturer}</strong><br>Avg MPG: ${d.MPG.toFixed(1)}`);
            })
            .on("mousemove", (event) => {
                this.tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                this.tooltip.style("opacity", 0);
            });

        // Add axes
        svg.append("g")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y));

        // Add labels
        svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.height + this.margin.bottom - 10)
            .style("text-anchor", "middle")
            .text("Average MPG");

        // Add persistent label if exists
        if (this.persistentLabels.barChart) {
            svg.append("text")
                .attr("class", "label")
                .attr("x", this.persistentLabels.barChart.x)
                .attr("y", this.persistentLabels.barChart.y)
                .text(this.persistentLabels.barChart.text)
                .attr("fill", "black");
        }
    }

    renderScatterPlot(data) {
        const container = d3.select("#scatter-plot");
        container.selectAll("*").remove();
        
        const svg = container.append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Create scales
        const x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.Horsepower)).nice()
            .range([0, this.width]);

        const y = d3.scaleLinear()
            .domain(d3.extent(data, d => d.MPG)).nice()
            .range([this.height, 0]);

        // Color scale
        const color = d3.scaleOrdinal()
            .domain(["American", "European", "Japanese"])
            .range(["#1f77b4", "#ff7f0e", "#2ca02c"]);

        // Add dots
        svg.selectAll(".dot")
            .data(data)
            .join("circle")
            .attr("class", "dot data-point")
            .attr("cx", d => x(d.Horsepower))
            .attr("cy", d => y(d.MPG))
            .attr("r", 4)
            .attr("fill", d => color(d.Origin))
            .attr("opacity", 0.7)
            .classed("highlighted", d => this.selectedPoints.has(d.Car))
            .on("click", (event, d) => {
                this.selectedPoints = new Set([d.Car]);
                this.persistentLabels.scatterPlot = {
                    text: `${d.Car} (${d.MPG} MPG)`,
                    x: x(d.Horsepower) + 10,
                    y: y(d.MPG) - 10
                };
                this.updateVisualizations();
            })
            .on("mouseover", (event, d) => {
                this.tooltip
                    .style("opacity", 1)
                    .html(`<strong>${d.Car}</strong><br>MPG: ${d.MPG}<br>HP: ${d.Horsepower}`);
            })
            .on("mousemove", (event) => {
                this.tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                this.tooltip.style("opacity", 0);
            });

        // Add brush
        const brush = d3.brush()
            .extent([[0, 0], [this.width, this.height]])
            .on("brush", (event) => {
                if (!event.selection) return;
                const [[x0, y0], [x1, y1]] = event.selection;
                this.selectedPoints = new Set(
                    data.filter(d => 
                        x(d.Horsepower) >= x0 && x(d.Horsepower) <= x1 &&
                        y(d.MPG) >= y0 && y(d.MPG) <= y1
                    ).map(d => d.Car)
                );
                if (this.selectedPoints.size !== 1) {
                    this.persistentLabels.scatterPlot = null;
                }
                this.updateVisualizations();
            })
            .on("end", (event) => {
                if (!event.selection) {
                    this.selectedPoints.clear();
                    this.updateVisualizations();
                }
            });

        svg.append("g")
            .attr("class", "brush")
            .call(brush);

        // Add axes
        svg.append("g")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y));

        // Add labels
        svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.height + this.margin.bottom - 10)
            .style("text-anchor", "middle")
            .text("Horsepower");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -this.margin.left + 20)
            .attr("x", -this.height / 2)
            .style("text-anchor", "middle")
            .text("MPG");

        // Add persistent label if exists
        if (this.persistentLabels.scatterPlot) {
            svg.append("text")
                .attr("class", "label")
                .attr("x", this.persistentLabels.scatterPlot.x)
                .attr("y", this.persistentLabels.scatterPlot.y)
                .attr("fill", "black")
                .attr("font-size", "12px")
                .text(this.persistentLabels.scatterPlot.text);
        }
    }

    renderWeightDistribution(data) {
        const container = d3.select("#weight-distribution");
        container.selectAll("*").remove();
        
        const svg = container.append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Group data by origin
        const groups = d3.groups(data, d => d.Origin);
        const allWeights = data.map(d => d.Weight);
        
        // Create scales
        const x = d3.scaleBand()
            .domain(groups.map(d => d[0]))
            .range([0, this.width])
            .padding(0.3);

        const y = d3.scaleLinear()
            .domain([0, d3.max(allWeights)]).nice()
            .range([this.height, 0]);

        // Color scale
        const color = d3.scaleOrdinal()
            .domain(["American", "European", "Japanese"])
            .range(["#1f77b4", "#ff7f0e", "#2ca02c"]);

        // Calculate summary statistics for each group
        groups.forEach(([origin, values]) => {
            const weights = values.map(d => d.Weight).sort(d3.ascending);
            const q1 = d3.quantile(weights, 0.25);
            const median = d3.quantile(weights, 0.5);
            const q3 = d3.quantile(weights, 0.75);
            const iqr = q3 - q1;
            const min = Math.max(weights[0], q1 - 1.5 * iqr);
            const max = Math.min(weights[weights.length - 1], q3 + 1.5 * iqr);

            // Draw box plot
            const xPos = x(origin) + x.bandwidth() / 2;
            
            // Main box
            svg.append("rect")
                .attr("x", xPos - 15)
                .attr("y", y(q3))
                .attr("width", 30)
                .attr("height", y(q1) - y(q3))
                .attr("fill", color(origin))
                .attr("stroke", "#000")
                .attr("class", "data-point")
                .on("mouseover", (event) => {
                    this.tooltip
                        .style("opacity", 1)
                        .html(`<strong>${origin}</strong><br>Median Weight: ${median.toFixed(0)} lbs`);
                })
                .on("mousemove", (event) => {
                    this.tooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", () => {
                    this.tooltip.style("opacity", 0);
                })
                .on("click", (event) => {
                    const carNames = values.map(v => v.Car);
                    this.selectedPoints = new Set(carNames);
                    this.persistentLabels.weightDistribution = {
                        text: `${origin}: Median ${median.toFixed(0)} lbs`,
                        x: xPos + 10,
                        y: y(median) - 10
                    };
                    this.updateVisualizations();
                })
                .classed("highlighted", () => 
                    values.some(v => this.selectedPoints.has(v.Car)));

            // Median line
            svg.append("line")
                .attr("x1", xPos - 15)
                .attr("x2", xPos + 15)
                .attr("y1", y(median))
                .attr("y2", y(median))
                .attr("stroke", "#000")
                .attr("stroke-width", 2);

            // Whiskers
            svg.append("line")
                .attr("x1", xPos)
                .attr("x2", xPos)
                .attr("y1", y(min))
                .attr("y2", y(max))
                .attr("stroke", "#000");

            // Whisker caps
            svg.append("line")
                .attr("x1", xPos - 10)
                .attr("x2", xPos + 10)
                .attr("y1", y(min))
                .attr("y2", y(min))
                .attr("stroke", "#000");

            svg.append("line")
                .attr("x1", xPos - 10)
                .attr("x2", xPos + 10)
                .attr("y1", y(max))
                .attr("y2", y(max))
                .attr("stroke", "#000");

            // Outliers
            const outliers = weights.filter(w => w < min || w > max);
            svg.selectAll(".outlier")
                .data(outliers)
                .join("circle")
                .attr("cx", xPos)
                .attr("cy", d => y(d))
                .attr("r", 3)
                .attr("fill", color(origin))
                .attr("stroke", "#000")
                .attr("class", "data-point")
                .on("mouseover", (event) => {
                    this.tooltip
                        .style("opacity", 1)
                        .html(`<strong>${origin}</strong><br>Median Weight: ${median.toFixed(0)} lbs`);
                })
                .on("mousemove", (event) => {
                    this.tooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", () => {
                    this.tooltip.style("opacity", 0);
                })
                .on("click", (event) => {
                    const carNames = values.map(v => v.Car);
                    this.selectedPoints = new Set(carNames);
                    this.persistentLabels.weightDistribution = {
                        text: `${origin}: Median ${median.toFixed(0)} lbs`,
                        x: xPos + 10,
                        y: y(median) - 10
                    };
                    this.updateVisualizations();
                })
                .classed("highlighted", d => 
                    values.some(v => v.Weight === d && this.selectedPoints.has(v.Car)));
        });

        // Add axes
        svg.append("g")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y));

        // Add labels
        svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.height + this.margin.bottom - 10)
            .style("text-anchor", "middle")
            .text("Vehicle Origin");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -this.margin.left + 20)
            .attr("x", -this.height / 2)
            .style("text-anchor", "middle")
            .text("Weight (lbs)");

        // Add persistent label if exists
        if (this.persistentLabels.weightDistribution) {
            svg.append("text")
                .attr("class", "label")
                .attr("x", this.persistentLabels.weightDistribution.x)
                .attr("y", this.persistentLabels.weightDistribution.y)
                .attr("fill", "black")
                .text(this.persistentLabels.weightDistribution.text);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CarVisualization();
});
