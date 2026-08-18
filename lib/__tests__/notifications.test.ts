import dayjs from 'dayjs';
import { reminderTimingFor } from '@/lib/notifications';
import { subscription } from '@/test-utils/factories';

const REMINDER_HOUR = 9;

describe('reminderTimingFor', () => {
    it('schedules the reminder leadDays before the renewal, in the morning', () => {
        const renewal = dayjs().add(20, 'day').startOf('day').add(15, 'hour');
        const timing = reminderTimingFor(
            subscription({ renewalDate: renewal.toISOString() }),
            3
        );

        expect(timing).not.toBeNull();
        expect(timing!.reminderDate.isSame(renewal.subtract(3, 'day'), 'day')).toBe(true);
        expect(timing!.reminderDate.hour()).toBe(REMINDER_HOUR);
        expect(timing!.reminderDate.minute()).toBe(0);
        expect(timing!.reminderDate.second()).toBe(0);
    });

    it('rolls a stale renewal date forward before working out the reminder', () => {
        // A monthly plan that first renewed a year ago has renewed since; the
        // reminder belongs before the next one, not the original.
        const timing = reminderTimingFor(
            subscription({
                // Deliberately not a whole number of months back: rolling an
                // exact multiple lands on today, where a lead time can't fit.
                renewalDate: dayjs().subtract(370, 'day').toISOString(),
                billing: 'Monthly',
            }),
            2
        );

        expect(timing).not.toBeNull();
        expect(timing!.renewalDate.isAfter(dayjs())).toBe(true);
        expect(timing!.reminderDate.isAfter(dayjs())).toBe(true);
    });

    it('fires shortly when the ideal reminder time has already passed', () => {
        // A plan renewing in two days with a 7-day lead is exactly when a
        // heads-up matters most. This used to return null and send nothing.
        const renewal = dayjs().add(2, 'day');
        const timing = reminderTimingFor(
            subscription({ renewalDate: renewal.toISOString() }),
            7
        );

        expect(timing).not.toBeNull();
        expect(timing!.reminderDate.isAfter(dayjs())).toBe(true);
        expect(timing!.reminderDate.isBefore(timing!.renewalDate)).toBe(true);
    });

    it('schedules nothing when even a catch-up would land after the renewal', () => {
        const timing = reminderTimingFor(
            subscription({ renewalDate: dayjs().add(5, 'minute').toISOString() }),
            1
        );

        expect(timing).toBeNull();
    });

    it('schedules nothing without a renewal date', () => {
        expect(reminderTimingFor(subscription({ renewalDate: undefined }), 3)).toBeNull();
    });

    it('schedules nothing for an unparseable renewal date', () => {
        expect(reminderTimingFor(subscription({ renewalDate: 'whenever' }), 3)).toBeNull();
    });

    it('never puts the reminder in the past, whatever the lead', () => {
        const timing = reminderTimingFor(
            subscription({ renewalDate: dayjs().add(45, 'day').toISOString() }),
            60
        );

        expect(timing).not.toBeNull();
        expect(timing!.reminderDate.isAfter(dayjs())).toBe(true);
    });

    it('handles a yearly plan on its own period', () => {
        const timing = reminderTimingFor(
            subscription({
                renewalDate: dayjs().subtract(18, 'month').toISOString(),
                billing: 'Yearly',
            }),
            5
        );

        expect(timing).not.toBeNull();
        expect(timing!.renewalDate.isAfter(dayjs())).toBe(true);
        // Rolled by whole years, so it lands within a year of now.
        expect(timing!.renewalDate.diff(dayjs(), 'day')).toBeLessThanOrEqual(366);
    });
});
