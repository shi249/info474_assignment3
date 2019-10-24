'use strict';

let data = "no data"
let allYearsData = "no data"
let svgScatterPlot = "" // keep SVG reference in global scope
let funcs = "" // scaling and mapping functions
let dropDown2 = ""

const m = {
    width: 500,
    height: 500,
    marginAll: 50
}

// load data and make scatter plot after window loads
svgScatterPlot = d3.select('body')
  .append('svg')
  .attr('width', m.width)
  .attr('height', m.height)

// d3.csv is basically fetch but it can be be passed a csv file as a parameter
d3.csv("dataEveryYear.csv")
  .then((csvData) => {
    data = csvData
    allYearsData = csvData
    funcs = makeAxesAndLabels()
    dropDown2 = d3.select("body").append("div")
    .attr("class", "filter")
    .append("select")
    .attr("name", "year");

    var options2 = dropDown2.selectAll("option")
        .data(d3.map(allYearsData,function(d) {return d.time;}).keys())
        .enter()
        .append("option");

    options2.text(function (d) { return d;})
        .attr("value", function (d) { return d;})
   
    makeScatterPlot(1960, funcs) // initial scatter plot
})
.then(() => {
    svgScatterPlot.selectAll('circle').exit().remove();
    dropDown2.on("change", function() {
      makeScatterPlot(this.value,funcs);
    })
})

function makeAxesAndLabels() {
    // get fertility_rate and life_expectancy arrays
    const fertilityData = data.map((row) => parseFloat(row["fertility_rate"]))
    const lifeData = data.map((row) => parseFloat(row["life_expectancy"]))

    // find limits of data
    const limits = findMinMax(fertilityData, lifeData)

    // draw axes and return scaling + mapping functions
    const funcs = drawAxes(limits, "fertility_rate", "life_expectancy", svgScatterPlot, 
        {min: m.marginAll, max: m.width - m.marginAll}, {min: m.marginAll, max: m.height - m.marginAll})

    // draw title and axes labels
    makeLabels()

    return funcs
}
  

// make scatter plot with trend line
function makeScatterPlot(year, funcs) {
  filterByYear(year)

  // plot data as points and add tooltip functionality
  plotData(funcs)

  // plot new title
  d3.select('#title').remove()
  svgScatterPlot.append('text')
    .attr('x', 50)
    .attr('y', 30)
    .attr('id', "title")
    .style('font-size', '14pt')
    .text("Countries by Life Expectancy and Fertility Rate (" + data[0]["time"] + ")")
}

function filterByYear(year) {
  data = allYearsData.filter((row) => row['time'] == year)
}

// make title and axes labels
function makeLabels() {
  svgScatterPlot.append('text')
    .attr('x', 50)
    .attr('y', 30)
    .attr('id', "title")
    .style('font-size', '14pt')
    .text("Countries by Life Expectancy and Fertility Rate (" + data[0]["time"] + ")")

  svgScatterPlot.append('text')
    .attr('x', 130)
    .attr('y', 490)
    .attr('id', "x-label")
    .style('font-size', '10pt')
    .text('Fertility Rates (Avg Children per Woman)')

  svgScatterPlot.append('text')
    .attr('transform', 'translate(15, 300)rotate(-90)')
    .style('font-size', '10pt')
    .text('Life Expectancy (years)')
}

// plot all the data points on the SVG
// and add tooltip functionality
function plotData(map) {
  // get population data as array
  let pop_data = data.map((row) => +row["pop_mlns"])
  let pop_limits = d3.extent(pop_data)
  // make size scaling function for population
  let pop_map_func = d3.scaleLinear()
    .domain([pop_limits[0], pop_limits[1]])
    .range([3, 20])

  // mapping functions
  let xMap = map.x
  let yMap = map.y

  // make tooltip
  let div = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0)
  .attr("width", 60)
  .attr("height", 60)
  // .attr("text-align", left)

  /*******************************************************
   * Enter, Update, Exit pattern
   *******************************************************/
  // reference to the start of our update
  // append new data to existing points
  let update = svgScatterPlot.selectAll('circle')
    .data(data)

  // add new circles
  update
    .enter()
    .append('circle')
      .attr('cx', xMap)
      .attr('cy', yMap)
      .attr('r', (d) => pop_map_func(d["pop_mlns"]))
      .attr('fill', "#4286f4")
      // add tooltip functionality to points
      .on("mouseover", (d) => {
        div.transition()
          .duration(200)
          .style("opacity", .9)
        div.html("Life Expectancy: " + d.life_expectancy + "<br/>"
          + "Fertility: " + d.fertility_rate + "<br/>"
          + "Coutry: "+d.location + "<br/>"  
          + "Population: " + numberWithCommas(d["pop_mlns"]*1000000) + "<br/>"
          + "Year: " + d.time)
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY - 28) + "px")         
      })
      .on("mouseout", (d) => {
        div.transition()
          .duration(500)
          .style("opacity", 0)
      })

  // update.exit() returns the elements we no longer need
  update.exit().remove() // remove old elements
  
  // animate the update
  // note: new elements CANNOT be animated
  update.transition().duration(500)
    .attr('cx', xMap)
    .attr('cy', yMap)
    .attr('r',(d) => pop_map_func(d["pop_mlns"]))
  
  /*******************************************
   * Enter, Update, Exit end
   ******************************************/
}

// draw the axes and ticks
// x -> the name of the field on the x axis
// y -> the name of the field on the y axis
// svg -> the svgContainer to draw on
// rangeX -> and object of the form {min: yourXMinimum, max: yourXMaximum}
// rangeY -> and object of the form {min: yourYMinimum, max: yourYMaximum}
function drawAxes(limits, x, y, svg, rangeX, rangeY) {
  // return x value from a row of data
  let xValue = function(d) { return +d[x] }

  // function to scale x value
  let xScale = d3.scaleLinear()
    .domain([limits.xMin, limits.xMax]) // give domain buffer room
    .range([rangeX.min, rangeX.max])

  // xMap returns a scaled x value from a row of data
  let xMap = function(d) { return xScale(xValue(d)) }

  // plot x-axis at bottom of SVG
  let xAxis = d3.axisBottom().scale(xScale)
  svg.append("g")
    .attr('transform', 'translate(0, ' + rangeY.max + ')')
    .attr('id', "x-axis")
    .call(xAxis)

  // return y value from a row of data
  let yValue = function(d) { return +d[y]}

  // function to scale y
  let yScale = d3.scaleLinear()
    .domain([limits.yMax, limits.yMin]) // give domain buffer
    .range([rangeY.min, rangeY.max])

  // yMap returns a scaled y value from a row of data
  let yMap = function (d) { return yScale(yValue(d)) }

  // plot y-axis at the left of SVG
  let yAxis = d3.axisLeft().scale(yScale)
  svg.append('g')
    .attr('transform', 'translate(' + rangeX.min + ', 0)')
    .attr('id', "y-axis")
    .call(yAxis)

  // return mapping and scaling functions
  return {
    x: xMap,
    y: yMap,
    xScale: xScale,
    yScale: yScale
  }
}

// find min and max for arrays of x and y
function findMinMax(x, y) {

  // get min/max x values
  let xMin = d3.min(x)
  let xMax = d3.max(x)

  // get min/max y values
  let yMin = d3.min(y)
  let yMax = d3.max(y)

  // return formatted min/max data as an object
  return {
    xMin : xMin,
    xMax : xMax,
    yMin : yMin,
    yMax : yMax
  }
}

// format numbers
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}
