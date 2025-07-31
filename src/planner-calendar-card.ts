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
            // events now accepts a function with (fetchInfo, successCallback, failureCallback)
            events: (fetchInfo, successCallback, failureCallback) => {
                this.getCalendarEvents(fetchInfo.startStr, fetchInfo.endStr)
                    .then(events => successCallback(events))
                    .catch(err => {
                        console.error('Error fetching calendar events:', err);
                        failureCallback(err);
                    });
            },
        });
        this.calendar.render();
    }

    updated(changedProps: Map<string, any>) {
        if (changedProps.has('hass') && this.calendar) {
            this.calendar.refetchEvents();
        }
    }

    // Fetch events for all configured calendars from HA API asynchronously
    async getCalendarEvents(startISO: string, endISO: string): Promise<EventInput[]> {
        const events: EventInput[] = [];
        if (!this.config.entities || !Array.isArray(this.config.entities)) {
            return events;
        }

        for (const calendarId of this.config.entities) {
            try {
                // Home Assistant calendar API expects: GET /api/calendars/<entity_id>?start=...&end=...
                const result = await this.hass.callApi<Array<{summary?: string; start: string; end?: string; all_day?: boolean}>>('GET', `calendars/${calendarId}`, {
                    start: startISO,
                    end: endISO,
                });

                // result is an array of events, each with: summary, start, end, all_day etc.
                for (const ev of result) {
                    events.push({
                        title: ev.summary || '(no title)',
                        start: ev.start,
                        end: ev.end || ev.start,
                        allDay: ev.all_day || false,
                    });
                }
            } catch (err) {
                console.warn(`Failed to load events for calendar ${calendarId}`, err);
            }
        }

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
