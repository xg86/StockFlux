import React, { useRef, useEffect } from 'react';
import './chart.css';
import * as d3 from 'd3'
import * as fc from 'd3fc';

const Chart = ({ chartData }) => {

  useEffect(() => {

    if (chartData != null) {
      chartData.sort((a, b) => {
        return a.date - b.date
      })
      makeChart(chartData)
    }

    // else {
    //   makeChart(fc.randomFinancial()(100))
    // }
  }, [chartData]);

  const showcaseContainer = useRef(null);
  const navigationContainer = useRef(null);
  const legendContainer = useRef(null)


  const legend = () => {
    const labelJoin = fc.dataJoin("text", "legend-label");
    const valueJoin = fc.dataJoin("text", "legend-value");

    const instance = selection => {
      selection.each((data, selectionIndex, nodes) => {
        labelJoin(d3.select(nodes[selectionIndex]), data)
          .attr("transform", (_, i) => "translate(0, " + (i + 1) * 15 + ")")
          .attr('x', '10%')
          .text(d => d.name);

        valueJoin(d3.select(nodes[selectionIndex]), data)
          .attr("transform", (_, i) => "translate(0, " + (i + 1) * 15 + ")")
          .attr('x', '25%')
          .text(d => d.value);
      });
    };

    instance.xScale = () => instance;
    instance.yScale = () => instance;
    return instance;
  };

  const priceFormat = d3.format(",.2f");
  const legendData = datum => [
    { name: "Open", value: priceFormat(datum.open) },
    { name: "High", value: priceFormat(datum.high) },
    { name: "Low", value: priceFormat(datum.low) },
    { name: "Close", value: priceFormat(datum.close) },
    { name: "Volume", value: priceFormat(datum.volume) }
  ];



  function makeChart(data) {

    //Extents calculate the domain/(min/max) of data
    var yExtent = fc.extentLinear().accessors([function (d) { return d.high; },
    function (d) { return d.low }]).pad([0.1, 0.1])

    var xExtent = fc.extentDate()
      .accessors([function (d) { return d.date; }]);

    var xScale = d3.scaleTime()
      .domain(xExtent(data));

    // var xScaleSkip = fc.scaleDiscontinuous(d3.scaleTime()).discontinuityProvider(fc.discontinuitySkipWeekends()).domain(xExtent(data))
    var yScale = d3.scaleLinear()
      .domain(yExtent(data));

    var chartData = {
      series: data,
      brushedRange: [0.75, 1],
      crosshair: []
    };

    var gridlines = fc.annotationSvgGridline().yTicks(10).xTicks(10)

    var area = fc.seriesSvgArea()
      .crossValue(function (d) { return d.date; })
      .mainValue(function (d) { return d.close; })

    var candlestick = fc.seriesSvgCandlestick()

    var brush = fc.brushX()
      .on('brush', function (evt) {
        // if the brush has zero height there is no selection
        if (evt.selection) {
          chartData.brushedRange = evt.selection;
          mainChart.xDomain(evt.xDomain);
          render();
        }
      });

    var navigationMulti = fc.seriesSvgMulti()
      .series([area, brush])
      .mapping((data, index, series) => {
        switch (series[index]) {
          case area:
            return data.series;
          case brush:
            return data.brushedRange;
        }
      });

    const chartLegend = legend()
    const crosshair = fc
      .annotationSvgCrosshair()
      .x(d => xScale(d.date)).xLabel('')
      .y(d => yScale(d.close)).yLabel('')
    const mainMulti = fc.seriesSvgMulti()
      .series([gridlines, candlestick, crosshair])

      .mapping((data, index, series) => {
        switch (series[index]) {
          // case chartLegend:
          //   const lastPoint = data.series[data.series.length - 1];
          //   return legendData(lastPoint)
          case crosshair:
            return data.crosshair
          default:
            return data.series
        }
      })


    var mainChart = fc.chartCartesian(xScale, yScale)
      .svgPlotArea(mainMulti)


    // {
    //   d3.select("#legend-container")
    //     .datum(legendData(data[data.length - 1]))
    //     .call(chartLegend);
    // });

    var navigatorChart = fc.chartCartesian(xScale.copy(), yScale.copy())
      .svgPlotArea(navigationMulti);

    var scale = d3.scaleTime().domain(xScale.domain());
    mainChart.xDomain(chartData.brushedRange.map(scale.invert));


    const closest = (arr, fn) =>
      arr.reduce(
        (acc, value, index) =>
          fn(value) < acc.distance ? { distance: fn(value), index, value } : acc,
        {
          distance: Number.MAX_VALUE,
          index: 0,
          value: arr[0]
        }
      ).value;


    const render = () => {
      d3.selectAll("#legend-container > *").remove();
      d3.select('#showcase-container')
        .datum(chartData)
        .call(mainChart);

      if (chartData.crosshair[0] !== undefined) {
        d3.select('#legend-container')
          .datum(legendData(chartData.crosshair[0]))
          .call(chartLegend)
      } else {
        d3.select('#legend-container')
          .datum(legendData(chartData.series[chartData.series.length - 1]))
          .call(chartLegend)
      }
      const pointer = fc.pointer().on("point", event => {
        chartData.crosshair = event.map(({ x }) => {
          const closestIndex = d3.bisector(d => d.date)
            .left(chartData.series, xScale.invert(x));
          return chartData.series[closestIndex];
        });
        render();

        // chartData.crosshair = event.map(pointer => {
        //   console.log(pointer)
        //   closest(chartData, d =>
        //     Math.abs(xScale.invert(pointer.x).getTime() - d.date.getTime())
        //   )
        // }
        // );
        // render()


      });

      d3.select("#showcase-container .plot-area").call(pointer);

    };

    // d3.select("#legend-container").datum(legendData(data[data.length - 1])).call(chartLegend);

    d3.select('#navigation-container')
      .datum(chartData)
      .call(navigatorChart)

    render()

  }

  return <div className="chart-content">
    <svg ref={legendContainer} id="legend-container" />
    <div ref={showcaseContainer} id="showcase-container" />
    <div ref={navigationContainer} id="navigation-container" />
  </div>
};
// .decorate(function (selection) {
//   var enter = selection.enter();
//   // console.log(enter)
//   // var handles = enter.select('.plot-line')
//   // console.log(handles)
//   var line = (d3.select('.plot-line'))
//   console.log("line", line)
//   var brush = (d3.select('.brush'))
//   console.log("brush", brush)
//   var handles = brush.selectAll('.handle')
//   console.log("handle", handles)
//   handles
//     .append('circle')
//     .attr('cy', 30)
//     .attr('r', 7)
//     .attr('class', 'outer-handle');
//   handles
//     .append('circle')
//     .attr('cy', 30)
//     .attr('r', 4)
//     .attr('class', 'inner-handle');
// })
export default Chart;
