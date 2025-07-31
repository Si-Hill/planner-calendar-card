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
            events: (info, successCallback, failureCallback) => {
                this.getCalendarEvents(info.startStr, info.endStr)
                    .then(events => successCallback(events))
                    .catch(err => failureCallback(err));
            },
        });
        this.calendar.render();
    }

    updated() {
        if (this.calendar) {
            this.calendar.refetchEvents();
        }
    }

    private async fetchCalendarEvents(entityId: string, start: string, end: string): Promise<EventInput[]> {
        try {
            const data = await this.hass.callApi<any[]>(
                'GET',
                `calendars/${entityId}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
            );

            return data.map((ev: any) => ({
                title: ev.summary || ev.title || 'No title',
                start: ev.start || ev.start_time,
                end: ev.end || ev.end_time || ev.start,
                allDay: ev.all_day || false,
            }));
        } catch (err: any) {
            throw new Error(`Failed to fetch events for ${entityId}, status: ${err?.status || 'unknown'}`);
        }
    }


    private async getCalendarEvents(start?: string, end?: string): Promise<EventInput[]> {
        if (!this.config.entities || !start || !end) return [];

        const events: EventInput[] = [];

        // Fetch events from all configured calendars in parallel
        const promises = this.config.entities.map(async (entityId: string) => {
            try {
                const evs = await this.fetchCalendarEvents(entityId, start, end);
                events.push(...evs);
            } catch (e) {
                console.error(`Failed to load events for calendar ${entityId}`, e);
            }
        });

        await Promise.all(promises);

        return events;
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
