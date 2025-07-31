import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from 'custom-card-helpers';

import { Calendar, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

@customElement('planner-calendar-card')
export class PlannerCalendarCard extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @property() public config!: LovelaceCardConfig;

    private calendar!: Calendar;
    private calendarEl!: HTMLDivElement;

    setConfig(config: LovelaceCardConfig) {
        this.config = config;
    }

    firstUpdated() {
        this.calendarEl = this.renderRoot.querySelector('#calendar')!;
        this.calendar = new Calendar(this.calendarEl, {
            plugins: [dayGridPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            height: 'auto',
            events: this.loadEvents.bind(this),
        });
        this.calendar.render();
    }

    updated() {
        if (this.calendar) {
            this.calendar.refetchEvents();
        }
    }

    // This is the async event source function FullCalendar calls with a date range
    async loadEvents(fetchInfo: { startStr: string; endStr: string }, successCallback: (events: EventInput[]) => void, failureCallback: (error: any) => void) {
        if (!this.config.entities || !this.hass) {
            successCallback([]);
            return;
        }

        const allEvents: EventInput[] = [];

        // Fetch events for each configured calendar entity
        for (const entityId of this.config.entities) {
            try {
                const events = await this.fetchCalendarEvents(entityId, fetchInfo.startStr, fetchInfo.endStr);
                allEvents.push(...events);
            } catch (err) {
                console.error(`Failed to load events for calendar ${entityId}`, err);
                failureCallback(err);
                return;
            }
        }

        successCallback(allEvents);
    }

    // Use Home Assistant's API to get events for a calendar entity within date range
    private async fetchCalendarEvents(entityId: string, start: string, end: string): Promise<EventInput[]> {
        const url = `/api/calendars/${entityId}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

        const response = await this.hass.connection.fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Map HA calendar events to FullCalendar event format
        return data.map((ev: any) => ({
            title: ev.summary || ev.title || 'No title',
            start: ev.start || ev.start_time,
            end: ev.end || ev.end_time || ev.start,
            allDay: ev.all_day || false,
        }));
    }

    render() {
        return html`<div id="calendar"></div>`;
    }

    static styles = css`
        #calendar {
            width: 100%;
            height: 100%;
        }
        :host {
            display: block;
            background-color: var(--card-background-color);
            color: var(--primary-text-color);
        }
    `;
}
