// (C) 2007-2018 GoodData Corporation
import get = require("lodash/get");
import debounce = require("lodash/debounce");
import * as CustomEvent from "custom-event";
import * as invariant from "invariant";
import {
    ChartElementType,
    ChartType,
    VisType,
    VisualizationTypes,
} from "../../../constants/visualizationTypes";
import {
    IDrillEvent,
    DrillEventContext,
    IDrillEventContextGroup,
    IDrillEventIntersectionElement,
    IDrillEventContextPoint,
    IDrillEventContextTable,
    IDrillPoint,
    IHighchartsPointObject,
    IDrillConfig,
    ICellDrillEvent,
    isGroupHighchartsDrillEvent,
} from "../../../interfaces/DrillEvents";
import { OnFiredDrillEvent } from "../../../interfaces/Events";
import { isComboChart, isHeatmap, isTreemap } from "./common";

export function getClickableElementNameByChartType(type: VisType): ChartElementType {
    switch (type) {
        case VisualizationTypes.LINE:
        case VisualizationTypes.AREA:
        case VisualizationTypes.SCATTER:
        case VisualizationTypes.BUBBLE:
            return "point";
        case VisualizationTypes.COLUMN:
        case VisualizationTypes.BAR:
            return "bar";
        case VisualizationTypes.PIE:
        case VisualizationTypes.TREEMAP:
        case VisualizationTypes.DONUT:
        case VisualizationTypes.FUNNEL:
            return "slice";
        case VisualizationTypes.HEATMAP:
            return "cell";
        default:
            invariant(false, `Unknown visualization type: ${type}`);
            return null;
    }
}

function fireEvent(onFiredDrillEvent: OnFiredDrillEvent, data: IDrillEvent, target: EventTarget) {
    const returnValue = onFiredDrillEvent(data);

    // if user-specified onFiredDrillEvent fn returns false, do not fire default DOM event
    if (returnValue !== false) {
        const event = new CustomEvent("drill", {
            detail: data,
            bubbles: true,
        });
        target.dispatchEvent(event);
    }
}

function composeDrillContextGroup(
    points: IHighchartsPointObject[],
    chartType: ChartType,
): IDrillEventContextGroup {
    const contextPoints: IDrillPoint[] = points.map((point: IHighchartsPointObject) => {
        return {
            x: point.x,
            y: point.y,
            intersection: point.drillIntersection,
        };
    });
    return {
        type: chartType,
        element: "label",
        points: contextPoints,
    };
}

function composeDrillContextPoint(
    point: IHighchartsPointObject,
    chartType: ChartType,
): IDrillEventContextPoint {
    const context: IDrillEventContextPoint = {
        type: chartType,
        element: getClickableElementNameByChartType(chartType),
        intersection: point.drillIntersection,
    };

    if (!isTreemap(chartType)) {
        context.x = point.x;
        context.y = point.y;
    }

    if (!isNaN(point.z)) {
        context.z = point.z;
    }

    if (isTreemap(chartType) || isHeatmap(chartType)) {
        context.value = point.value ? point.value.toString() : "";
    }

    return context;
}

const chartClickDebounced = debounce(
    (
        drillConfig: IDrillConfig,
        event: Highcharts.DrilldownEventObject,
        target: EventTarget,
        chartType: ChartType,
    ) => {
        const { afm, onFiredDrillEvent } = drillConfig;
        const isDrillGroupContext = isGroupHighchartsDrillEvent(event);
        const points: IHighchartsPointObject[] = isDrillGroupContext
            ? (event.points as IHighchartsPointObject[])
            : new Array<IHighchartsPointObject>();
        const point: IHighchartsPointObject = event.point as IHighchartsPointObject;

        let usedChartType = chartType;
        if (isComboChart(chartType)) {
            usedChartType = get(event, ["point", "series", "options", "type"], chartType);
        }

        const drillContext: DrillEventContext = isDrillGroupContext
            ? composeDrillContextGroup(points, usedChartType)
            : composeDrillContextPoint(point, usedChartType);

        const data: IDrillEvent = {
            executionContext: afm,
            drillContext,
        };

        fireEvent(onFiredDrillEvent, data, target);
    },
);

export function chartClick(
    drillConfig: IDrillConfig,
    event: Highcharts.DrilldownEventObject,
    target: EventTarget,
    chartType: ChartType,
) {
    chartClickDebounced(drillConfig, event, target, chartType);
}

const tickLabelClickDebounce = debounce(
    (
        drillConfig: IDrillConfig,
        points: IHighchartsPointObject[],
        target: EventTarget,
        chartType: ChartType,
    ): void => {
        const { afm, onFiredDrillEvent } = drillConfig;
        const contextPoints: IDrillPoint[] = points.map((point: IHighchartsPointObject) => {
            return {
                x: point.x,
                y: point.y,
                intersection: point.drillIntersection,
            };
        });
        const drillContext: DrillEventContext = {
            type: chartType,
            element: "label",
            points: contextPoints,
        };
        const data: IDrillEvent = {
            executionContext: afm,
            drillContext,
        };

        fireEvent(onFiredDrillEvent, data, target);
    },
);

export function tickLabelClick(
    drillConfig: IDrillConfig,
    points: IHighchartsPointObject[],
    target: EventTarget,
    chartType: ChartType,
) {
    tickLabelClickDebounce(drillConfig, points, target, chartType);
}

export function cellClick(drillConfig: IDrillConfig, event: ICellDrillEvent, target: EventTarget) {
    const { afm, onFiredDrillEvent } = drillConfig;
    const { columnIndex, rowIndex, row, intersection } = event;

    const drillContext: IDrillEventContextTable = {
        type: VisualizationTypes.TABLE,
        element: "cell",
        columnIndex,
        rowIndex,
        row,
        intersection,
    };
    const data: IDrillEvent = {
        executionContext: afm,
        drillContext,
    };

    fireEvent(onFiredDrillEvent, data, target);
}

export function createDrillIntersectionElement(
    id: string,
    title: string,
    uri?: string,
    identifier?: string,
): IDrillEventIntersectionElement {
    const element: IDrillEventIntersectionElement = {
        id: id || "",
        title: title || "",
    };

    if (uri || identifier) {
        element.header = {
            uri: uri || "",
            identifier: identifier || "",
        };
    }

    return element;
}
