import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from 'custom-card-helpers';

import { Calendar } from '@fullcalendar/core';
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
            if (!state || !state.attributes.start_time) continue;

            const attrs = state.attributes;
            events.push({
                title: attrs.message,
                start: attrs.start_time,
                end: attrs.end_time || attrs.start_time,
                allDay: attrs.all_day || false,
            });
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
