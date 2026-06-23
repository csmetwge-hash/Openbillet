'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface DateTimePickerProps {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24hr)
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onClear?: () => void;
}

// Detect iOS Safari — only place we need the custom picker
function isIOS() {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function CustomPicker({ date, time, onDateChange, onTimeChange, onClear }: DateTimePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const calendarRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  const parseTime = (t: string) => {
    if (!t) return { hour: '09', minute: '00', ampm: 'AM' };
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return { hour: String(hour12).padStart(2, '0'), minute: String(m).padStart(2, '0'), ampm };
  };

  const { hour, minute, ampm } = parseTime(time);

  const setTimePart = (newHour: string, newMinute: string, newAmpm: string) => {
    let h = parseInt(newHour);
    if (newAmpm === 'PM' && h !== 12) h += 12;
    if (newAmpm === 'AM' && h === 12) h = 0;
    onTimeChange(`${String(h).padStart(2, '0')}:${newMinute}`);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) setShowCalendar(false);
      if (timeRef.current && !timeRef.current.contains(e.target as Node)) setShowTimePicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDate = date ? new Date(date + 'T00:00:00') : null;
  const today = new Date();

  const formatDateDisplay = () => {
    if (!date) return 'Date';
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTimeDisplay = () => {
    if (!time) return 'Time';
    return `${hour}:${minute} ${ampm}`;
  };

  const selectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onDateChange(`${yyyy}-${mm}-${dd}`);
    setShowCalendar(false);
    if (!time) { onTimeChange('09:00'); setShowTimePicker(true); }
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div className="flex gap-2">
      {/* Date */}
      <div className="flex-1 relative" ref={calendarRef}>
        <button type="button" onClick={() => { setShowCalendar(v => !v); setShowTimePicker(false); }}
          className="w-full flex items-center justify-between gap-1 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm hover:border-zinc-400 transition cursor-pointer bg-white">
          <span className={date ? 'text-zinc-900' : 'text-zinc-400 text-xs'}>{formatDateDisplay()}</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        </button>
        {showCalendar && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 p-3 w-72">
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={prevMonth} className="p-1.5 hover:bg-zinc-100 rounded-lg cursor-pointer">
                <ChevronLeft className="w-4 h-4 text-zinc-600" />
              </button>
              <span className="text-sm font-bold text-zinc-900">{MONTHS[viewMonth]} {viewYear}</span>
              <button type="button" onClick={nextMonth} className="p-1.5 hover:bg-zinc-100 rounded-lg cursor-pointer">
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => <div key={d} className="text-center text-[10px] font-bold uppercase text-zinc-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const isSelected = selectedDate && selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day;
                const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
                return (
                  <button type="button" key={i} onClick={() => selectDay(day)}
                    className={`h-9 w-full rounded-xl text-sm font-medium transition cursor-pointer ${isSelected ? 'bg-zinc-900 text-white' : isToday ? 'bg-zinc-100 font-bold text-zinc-900' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                    {day}
                  </button>
                );
              })}
            </div>
            {date && onClear && (
              <button type="button" onClick={() => { onClear(); setShowCalendar(false); }}
                className="w-full mt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-red-500 transition cursor-pointer pt-2 border-t border-zinc-100">
                Clear date
              </button>
            )}
          </div>
        )}
      </div>

      {/* Time */}
      <div className="w-28 relative" ref={timeRef}>
        <button type="button" onClick={() => { setShowTimePicker(v => !v); setShowCalendar(false); }}
          disabled={!date}
          className="w-full flex items-center justify-between gap-1 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm hover:border-zinc-400 transition cursor-pointer bg-white disabled:opacity-40 disabled:cursor-not-allowed">
          <span className={time ? 'text-zinc-900 text-xs' : 'text-zinc-400 text-xs'}>{formatTimeDisplay()}</span>
          <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
        </button>
        {showTimePicker && (
          <div className="absolute top-full right-0 mt-1 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 p-3 w-48">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Hour</p>
            <div className="grid grid-cols-4 gap-1 mb-3">
              {HOURS.map(h => (
                <button type="button" key={h} onClick={() => setTimePart(h, minute, ampm)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${hour === h ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                  {h}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Minute</p>
            <div className="grid grid-cols-4 gap-1 mb-3">
              {MINUTES.map(m => (
                <button type="button" key={m} onClick={() => setTimePart(hour, m, ampm)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${minute === m ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                  :{m}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {['AM', 'PM'].map(ap => (
                <button type="button" key={ap} onClick={() => setTimePart(hour, minute, ap)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${ampm === ap ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                  {ap}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Native picker for Android/desktop - much better UX than custom on those platforms
function NativePicker({ date, time, onDateChange, onTimeChange, onClear }: DateTimePickerProps) {
  // Combine into datetime-local value
  const combinedValue = date && time ? `${date}T${time}` : date ? `${date}T09:00` : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) { onClear?.(); return; }
    const [d, t] = val.split('T');
    onDateChange(d);
    onTimeChange(t?.slice(0, 5) || '09:00');
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        type="datetime-local"
        value={combinedValue}
        onChange={handleChange}
        className="flex-1 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-900 transition [color-scheme:light]"
      />
      {date && onClear && (
        <button type="button" onClick={onClear}
          className="text-[10px] font-bold text-zinc-400 hover:text-red-500 transition cursor-pointer whitespace-nowrap">
          Clear
        </button>
      )}
    </div>
  );
}

// Main export — auto-selects the right picker
export default function SmartDateTimePicker(props: DateTimePickerProps) {
  const [ios, setIos] = useState(false);
  useEffect(() => { setIos(isIOS()); }, []);
  return ios ? <CustomPicker {...props} /> : <NativePicker {...props} />;
}