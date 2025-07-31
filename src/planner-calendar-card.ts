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
            events: () => this.getCalendarEvents()
        });
        this.calendar.render();
    }

    updated() {
        if (this.calendar) {
            this.calendar.refetchEvents();
        }
    }

    getCalendarEvents() {
        const events: any[] = [];
        if (!this.config.entities) return events;

        for (const entityId of this.config.entities) {
            const state = this.hass.states[entityId];
            if (!state) continue;

            const calendarEvents = state.attributes.entries || state.attributes.events || [];

            for (const ev of calendarEvents) {
                events.push({
                    title: ev.summary || ev.title || 'No title',
                    start: ev.start || ev.start_time,
                    end: ev.end || ev.end_time || ev.start,
                    allDay: ev.all_day || false,
                });
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
