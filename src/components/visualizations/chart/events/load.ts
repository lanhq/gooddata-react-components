// (C) 2007-2019 GoodData Corporation
import { setupDrilldown } from "./setupDrilldownToParentAttribute";
// (C) 2007-2018 GoodData Corporation
export const Highcharts = require("highcharts/highcharts"); // tslint:disable-line

// TODO: once Highcharts is upgraded to 7.0.1, 'yAxis.className' can be used to avoid registering 'load' event
// We can add 'className' to 'yAxis' in 'chartOptionsBuilder.ts' and 'customConfiguration.ts'
// (https://api.highcharts.com/highcharts/yAxis.className is supported since 5.0.0)
/**
 * Add class to Y axis to support selenium test for dual axes chart
 * @param chart
 */
function addClassToYAxis(chart: Highcharts.Chart): void {
    const yAxis: any[] = (chart && chart.yAxis) || [];

    yAxis.forEach((axis: any) => {
        const axisType: string = axis.opposite ? "secondary" : "primary";
        axis.axisGroup.addClass(`s-highcharts-${axisType}-yaxis`);
        axis.labelGroup.addClass(`s-highcharts-${axisType}-yaxis-labels`);
    });
}

export default function handleChartLoad() {
    addClassToYAxis(this);
    setupDrilldown(this);
}
