import { Pipe, PipeTransform } from '@angular/core';
import { DateLike, fullName, toMillis } from '../core/models';

/** Normalises Firestore Timestamps / numbers / strings to epoch millis for DatePipe. */
@Pipe({ name: 'millis' })
export class MillisPipe implements PipeTransform {
  transform(value: DateLike | string): number | null {
    const ms = toMillis(value);
    return ms ? ms : null;
  }
}

@Pipe({ name: 'fullName' })
export class FullNamePipe implements PipeTransform {
  transform(value: { name?: string; surname?: string } | null | undefined): string {
    return fullName(value);
  }
}

@Pipe({ name: 'statusLabel' })
export class StatusLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return (value ?? '').replace(/_/g, ' ');
  }
}
