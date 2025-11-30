console.log("Han River bike project loaded!");

// -------------------------------
// 1) Load CSV data and prepare it
// -------------------------------
d3.csv("bike.csv").then((data) => {

  // Convert fields to numbers and parse the Date
  data.forEach(d => {
    d["Rented Bike Count"] = +d["Rented Bike Count"];
    d.Temperature = +d.Temperature;
    d.Humidity = +d.Humidity;
    d["Wind speed"] = +d["Wind speed"];
    d.Visibility = +d.Visibility;
    d["Solar Radiation"] = +d["Solar Radiation"];
    d.Rainfall = +d.Rainfall;
    d.Snowfall = +d.Snowfall;
    d.Hour = +d.Hour;

    // Convert string date "DD/MM/YYYY" → JavaScript Date object
    const parts = d.Date.split("/");
    const dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
    d.Date = isNaN(dateObj) ? null : dateObj;
  });

  // Keep only rows with valid dates
  const validData = data.filter(d => d.Date);

  // -------------------------------
  // 2) Daily scatter plot (total rentals per day)
  // -------------------------------
  const scatterDataDaily = d3.rollups(
    validData,
    v => ({
      sumRent: d3.sum(v, d => d["Rented Bike Count"]),
      avgTemp: d3.mean(v, d => d.Temperature),
      avgHumidity: d3.mean(v, d => d.Humidity),
      avgWind: d3.mean(v, d => d["Wind speed"]),
      avgSolar: d3.mean(v, d => d["Solar Radiation"]),
      sumRain: d3.sum(v, d => d.Rainfall),
      Season: v[0].Seasons
    }),
    d => d.Date.toISOString().slice(0, 10)
  ).map(([date, d]) => ({ Date: new Date(date), ...d }))
   .filter(d => d.sumRent > 0); // drop days with no rentals

  // Set up SVG canvas for scatter plot
  const scatterWidth = 800, scatterHeight = 130;
  const scatterMargin = { top: 60, right: 40, bottom: 60, left: 100 };

  const svgScatter = d3.select("#vis-scatter")
    .html("")
    .append("svg")
    .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
    .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
    .append("g")
    .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

  // X scale: time (dates)
  const xScatter = d3.scaleTime()
    .domain(d3.extent(scatterDataDaily, d => d.Date))
    .range([0, scatterWidth]);

  // Y scale: total daily rentals
  const yScatter = d3.scaleLinear()
    .domain(d3.extent(scatterDataDaily, d => d.sumRent))
    .range([scatterHeight, 0])
    .nice();

  // Color scale for seasons
  const seasonColor = d3.scaleOrdinal()
    .domain(["Winter", "Spring", "Summer", "Autumn"])
    .range(["#1f77b4", "#2ca02c", "#ff7f0e", "#d62728"]);

  // Tooltip for showing detailed info on hover
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("padding", "6px 10px")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "12px");

  // Draw scatter points for each day
  const circles = svgScatter.selectAll("circle")
    .data(scatterDataDaily)
    .enter()
    .append("circle")
    .attr("cx", d => xScatter(d.Date))
    .attr("cy", d => yScatter(d.sumRent))
    .attr("r", 3)
    .attr("fill", d => seasonColor(d.Season));

  // Tooltip interaction
  circles.on("mouseover", (event, d) => {
    tooltip.transition().duration(100).style("opacity", 1);
    const dateStr = d.Date ? d.Date.toLocaleDateString() : "N/A";
    tooltip.html(
      `Date: ${dateStr}<br>` +
      `Rented Bikes: ${d.sumRent}<br>` +
      `Temperature: ${d.avgTemp.toFixed(1)}℃<br>` +
      `Humidity: ${d.avgHumidity.toFixed(1)}%<br>` +
      `Wind Speed: ${d.avgWind.toFixed(1)} m/s<br>` +
      `Solar Radiation: ${d.avgSolar.toFixed(2)}<br>` +
      `Rainfall: ${d.sumRain.toFixed(1)} mm`
    )
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px");
  }).on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));

  // X-axis: month labels
  svgScatter.append("g")
    .attr("transform", `translate(0,${scatterHeight})`)
    .call(d3.axisBottom(xScatter).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b")))
    .selectAll("text")
    .style("font-size", "14px");

  // Y-axis: total rentals
  svgScatter.append("g")
    .call(d3.axisLeft(yScatter).ticks(5))
    .selectAll("text")
    .style("font-size", "14px");

  // Axis labels
  svgScatter.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + scatterMargin.bottom - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Month");

  svgScatter.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -scatterHeight / 2)
    .attr("y", -scatterMargin.left + 20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Total Rented Bike Count");

  // -------------------------------
  // Scatter plot legend for seasons
  // -------------------------------
  const legendData = ["Winter", "Spring", "Summer", "Autumn"];
  const legendColor = d3.scaleOrdinal()
    .domain(legendData)
    .range(["#1f77b4", "#2ca02c", "#ff7f0e", "#d62728"]);

  const legendEl = d3.select("#scatter-legend");
  legendEl.html(""); // clear existing content

  const legendItems = legendEl.selectAll(".legend-item")
    .data(legendData)
    .enter()
    .append("div")
    .attr("class", "legend-item")
    .style("display", "flex")
    .style("align-items", "center")
    .style("margin-bottom", "8px");

  legendItems.append("div")
    .style("width", "12px")
    .style("height", "12px")
    .style("border-radius", "50%")
    .style("background-color", d => legendColor(d));

  legendItems.append("span")
    .style("margin-left", "8px")
    .style("font-size", "14px")
    .text(d => d);

  // -------------------------------
  // 3) Hourly rental heatmap
  // -------------------------------
  const heatmapWidth = 900, heatmapHeight = 70;
  const heatmapMargin = { top: 10, right: 30, bottom: 20, left: 40 };
  const hours = d3.range(0, 24);

  const svgHeatmap = d3.select("#vis-heatmap")
    .html("")
    .append("svg")
    .attr("width", heatmapWidth + heatmapMargin.left + heatmapMargin.right)
    .attr("height", heatmapHeight + heatmapMargin.top + heatmapMargin.bottom)
    .append("g")
    .attr("transform", `translate(${heatmapMargin.left},${heatmapMargin.top})`);

  const xScaleHeat = d3.scaleBand().domain(hours).range([0, heatmapWidth]).padding(0.05);
  const yScaleHeat = d3.scaleLinear().range([heatmapHeight, 0]);

  // Update heatmap with filtered/selected data
  function updateHeatmap(selectedData) {
    const heatmapData = hours.map(hour => {
      const filtered = selectedData.filter(d => d.Hour === hour);
      const avgRent = d3.mean(filtered, d => d["Rented Bike Count"]) || 0;
      return { hour, avgRent };
    });

    // Peak hour computation
    const maxVal = d3.max(heatmapData, d => d.avgRent);
    const maxHour24 = heatmapData.find(d => d.avgRent === maxVal)?.hour;

    const to12h = (h) => {
      if (h == 0) return "12 AM";
      if (h < 12) return `${h} AM`;
      if (h == 12) return "12 PM";
      return `${h - 12} PM`;
    };

    let peakDisplay = "–";
    if (maxHour24 != null) {
      const peakHour12 = to12h(maxHour24).replace(" ", "");
      const peakAvg = Math.round(maxVal);
      peakDisplay = `Peak Hour: ${peakHour12}, Rental Average: ${d3.format(",")(peakAvg)}`;
    }

    d3.select("#max-hour-display")
      .html(`<span style="color:#2980b9; font-weight:bold; font-size:18px;">
        ${peakDisplay}
      </span>`);

    yScaleHeat.domain([0, maxVal]).nice(3);
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxVal + 500]);

    const rects = svgHeatmap.selectAll("rect").data(heatmapData);
    rects.enter().append("rect")
      .merge(rects)
      .attr("x", d => xScaleHeat(d.hour))
      .attr("y", d => yScaleHeat(d.avgRent))
      .attr("width", xScaleHeat.bandwidth())
      .attr("height", d => heatmapHeight - yScaleHeat(d.avgRent))
      .attr("fill", d => colorScale(d.avgRent))
      .attr("stroke", "#fff");
    rects.exit().remove();

    const texts = svgHeatmap.selectAll(".label").data(heatmapData);
    texts.enter()
      .append("text")
      .attr("class", "label")
      .merge(texts)
      .attr("x", d => xScaleHeat(d.hour) + xScaleHeat.bandwidth() / 2)
      .attr("y", d => (yScaleHeat(d.avgRent) + heatmapHeight) / 2 + 2)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "black")
      .style("font-weight", "bold")
      .text(d => Math.round(d.avgRent));
    texts.exit().remove();

    svgHeatmap.selectAll(".x-axis").remove();
    svgHeatmap.selectAll(".y-axis").remove();

    svgHeatmap.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${heatmapHeight})`)
      .call(d3.axisBottom(xScaleHeat));

    svgHeatmap.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScaleHeat).ticks(3));
  }

  // Show heatmap for all data initially
  updateHeatmap(validData);

  // -------------------------------
  // 4) Brush selection linking scatter → heatmap, bars, correlation
  // -------------------------------
  const brush = d3.brush()
    .extent([[0, 0], [scatterWidth, scatterHeight]])
    .on("end", (event) => {
      let selectedDaily = scatterDataDaily;
      let periodText = "None";
      let avgText = "";

      if (event.selection) {
        const [[x0, y0], [x1, y1]] = event.selection;
        selectedDaily = scatterDataDaily.filter(d =>
          xScatter(d.Date) >= x0 && xScatter(d.Date) <= x1 &&
          yScatter(d.sumRent) >= y0 && yScatter(d.sumRent) <= y1
        );

        if (selectedDaily.length > 0) {
          const start = d3.min(selectedDaily, d => d.Date);
          const end = d3.max(selectedDaily, d => d.Date);
          const format = d3.timeFormat("%-m/%-d");
          periodText = `${format(start)}~${format(end)}`;

          const avgDailyRent = d3.mean(selectedDaily, d => d.sumRent) || 0;
          avgText = `, Rental Average: ${d3.format(",.0f")(avgDailyRent)}`;
        }
      }

      d3.select("#scatter-title")
        .html(`Daily Bike Rentals Over the Year (<span style="color:#2980b9; font-weight:bold; font-size:18px">
        Brush period: ${periodText}${avgText.replace(', Avg: ', '')}
        </span>)`);

      const selectedDates = new Set(selectedDaily.map(d => d.Date.toISOString().slice(0, 10)));
      const selectedRawData = validData.filter(d => selectedDates.has(d.Date.toISOString().slice(0, 10)));

      updateHeatmap(selectedRawData);
      drawBarCharts(selectedDaily);
      drawCorrMatrix(selectedRawData);
    });

  svgScatter.append("g").attr("class", "brush").call(brush).lower();

  // -------------------------------
  // 5) Mini bar charts for weather metrics
  // -------------------------------
  const metrics = [
    { id: "vis-bar-temp", key: "avgTemp", title: "Temperature (℃)" },
    { id: "vis-bar-humidity", key: "avgHumidity", title: "Humidity (%)" },
    { id: "vis-bar-wind", key: "avgWind", title: "Wind Speed (m/s)" },
    { id: "vis-bar-solar", key: "avgSolar", title: "Solar Radiation" },
    { id: "vis-bar-rain", key: "sumRain", title: "Rainfall (mm)" }
  ];

  const globalMax = {
    avgTemp: d3.max(scatterDataDaily, d => d.avgTemp),
    avgHumidity: d3.max(scatterDataDaily, d => d.avgHumidity),
    avgWind: d3.max(scatterDataDaily, d => d.avgWind),
    avgSolar: d3.max(scatterDataDaily, d => d.avgSolar),
    sumRain: d3.sum(scatterDataDaily, d => d.sumRain) * 1.1
  };

  const globalAvg = {
    avgTemp: d3.mean(scatterDataDaily, d => d.avgTemp),
    avgHumidity: d3.mean(scatterDataDaily, d => d.avgHumidity),
    avgWind: d3.mean(scatterDataDaily, d => d.avgWind),
    avgSolar: d3.mean(scatterDataDaily, d => d.avgSolar),
    sumRain: d3.sum(scatterDataDaily, d => d.sumRain)
  };

  function drawBarCharts(data) {
    metrics.forEach(m => {
      const values = data.map(d => d[m.key]);
      const val = m.key === "sumRain" ? d3.sum(values) : d3.mean(values);
      const safeVal = isNaN(val) ? 0 : val;

      const width = 180, height = 100, margin = { top: 20, right: 20, bottom: 20, left: 50 };

      d3.select(`#${m.id}`).html("");

      const svg = d3.select(`#${m.id}`)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .domain([m.title])
        .range([0, width - margin.left - margin.right])
        .padding(0.4);

      const y = d3.scaleLinear()
        .domain([0, globalMax[m.key]])
        .range([height - margin.top - margin.bottom, 0])
        .nice();

      // Draw global reference line (average/total)
      const avgVal = m.key === "sumRain" ? globalAvg[m.key] : globalAvg[m.key];
      if (!isNaN(avgVal)) {
        const lineEndX = width - margin.left - margin.right - 25;
        svg.append("line")
          .attr("x1", 0)
          .attr("x2", lineEndX)
          .attr("y1", y(avgVal))
          .attr("y2", y(avgVal))
          .attr("stroke", "#ff6b6b")
          .attr("stroke-dasharray", "4,2")
          .attr("stroke-width", 1.5);

        svg.append("text")
          .attr("x", lineEndX + 5)
          .attr("y", y(avgVal))
          .attr("dy", "0.35em")
          .attr("text-anchor", "start")
          .style("font-size", "10px")
          .style("fill", "#ff6b6b")
          .text(m.key === "sumRain" ? "Sum" : "Avg");
      }

      svg.append("g")
        .call(d3.axisLeft(y).ticks(3))
        .selectAll("text")
        .style("font-size", "11px");

      svg.append("g")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x));

      svg.selectAll(".bar")
        .data([safeVal])
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", () => x(m.title))
        .attr("y", d => y(d))
        .attr("width", x.bandwidth())
        .attr("height", d => Math.max(0, height - margin.top - margin.bottom - y(d)))
        .attr("fill", "#69b3a2");

      svg.selectAll(".label")
        .data([safeVal])
        .enter()
        .append("text")
        .attr("x", () => x(m.title) + x.bandwidth() / 2)
        .attr("y", d => y(d) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(d => d.toFixed(1));
    });
  }

  drawBarCharts(scatterDataDaily);

  // -------------------------------
  // 6) Correlation heatmap (Rented Bikes vs Weather)
  // -------------------------------
  const yVars = ["Rented Bike Count"];
  const xVars = [
    "Temperature", "Humidity", "Wind speed",
    "Visibility", "Solar Radiation", "Rainfall"
  ];

  const corrWidth = 900, corrHeight = 30;
  const corrMargin = { top: 20, right: 20, bottom: 30, left: 120 };

  const svgCorr = d3.select("#vis-corr")
    .html("")
    .append("svg")
    .attr("width", corrWidth + corrMargin.left + corrMargin.right)
    .attr("height", corrHeight + corrMargin.top + corrMargin.bottom)
    .append("g")
    .attr("transform", `translate(${corrMargin.left},${corrMargin.top})`);

  const xScaleCorr = d3.scaleBand().domain(xVars).range([0, corrWidth]).padding(0.05);
  const yScaleCorr = d3.scaleBand().domain(yVars).range([0, corrHeight]).padding(0.05);
  const colorScaleCorr = d3.scaleSequential(d3.interpolateBlues).domain([1, -1]);

  // Pearson correlation function
  function corr(x, y) {
    const meanX = d3.mean(x);
    const meanY = d3.mean(y);
    const cov = d3.sum(x.map((d, i) => (d - meanX) * (y[i] - meanY)));
    const stdX = Math.sqrt(d3.sum(x.map(d => (d - meanX) ** 2)));
    const stdY = Math.sqrt(d3.sum(y.map(d => (y - meanY) ** 2)));
    return cov / (stdX * stdY);
  }

  function drawCorrMatrix(data) {
    const dailyMetrics = d3.rollups(
      data,
      v => ({
        "Rented Bike Count": d3.sum(v, d => d["Rented Bike Count"]),
        "Temperature": d3.mean(v, d => d.Temperature),
        "Humidity": d3.mean(v, d => d.Humidity),
        "Wind speed": d3.mean(v, d => d["Wind speed"]),
        "Visibility": d3.mean(v, d => d.Visibility),
        "Dew point temperature": d3.mean(v, d => d["Dew point temperature"]),
        "Solar Radiation": d3.mean(v, d => d["Solar Radiation"]),
        "Rainfall": d3.sum(v, d => d.Rainfall)
      }),
      d => d.Date.toISOString().slice(0, 10)
    ).map(([date, d]) => d);

    const matrix = xVars.map(xVar => ({
      x: xVar,
      y: "Rented Bike Count",
      value: corr(
        dailyMetrics.map(d => d["Rented Bike Count"]),
        dailyMetrics.map(d => d[xVar])
      )
    }));

    const rects = svgCorr.selectAll("rect").data(matrix);
    rects.enter().append("rect")
      .merge(rects)
      .attr("x", d => xScaleCorr(d.x))
      .attr("y", d => yScaleCorr(d.y))
      .attr("width", xScaleCorr.bandwidth())
      .attr("height", yScaleCorr.bandwidth())
      .attr("fill", d => colorScaleCorr(d.value))
      .attr("stroke", "#fff");
    rects.exit().remove();

    const labels = svgCorr.selectAll(".corr-label").data(matrix);
    labels.enter().append("text")
      .attr("class", "corr-label")
      .merge(labels)
      .attr("x", d => xScaleCorr(d.x) + xScaleCorr.bandwidth() / 2)
      .attr("y", d => yScaleCorr(d.y) + yScaleCorr.bandwidth() / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("fill", "black")
      .style("font-weight", "bold")
      .style("font-size", "12px")
      .text(d => d.value.toFixed(2));
    labels.exit().remove();

    const top2 = matrix
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 2)
      .map(d => d.x);

    d3.select("#important-factors")
      .html(`(<span style="color:#2980b9; font-weight:bold">${top2.join(", ")}</span>)`);

    svgCorr.selectAll(".x-axis").remove();
    svgCorr.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${corrHeight})`)
      .call(d3.axisBottom(xScaleCorr))
      .selectAll("text")
      .style("text-anchor", "middle")
      .style("font-size", "13px")
      .attr("dy", "1em");

    svgCorr.selectAll(".y-axis").remove();
    svgCorr.append("g")
      .attr("class", "y-axis")
      .style("font-size", "12px")
      .call(d3.axisLeft(yScaleCorr));
  }

  drawCorrMatrix(validData);

});
