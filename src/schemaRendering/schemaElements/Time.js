import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";

function Time(props) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [value, setValue] = useState("");

  // Parse time string (e.g. "25:30" -> hours:minutes) into days, hours, minutes
  function parseTime(timeStr) {
    if (!timeStr || timeStr === "") return { days: 0, hours: 0, minutes: 0 };
    
    const [totalHours, mins] = timeStr.split(':').map(Number);
    const d = Math.floor(totalHours / 24);
    const h = totalHours % 24;
    return { days: d, hours: h, minutes: mins };
  }

  // Handle incoming props.value
  useEffect(() => {
    if (props.value && props.value !== "") {
      const { days: d, hours: h, minutes: m } = parseTime(props.value);
      setDays(d);
      setHours(h);
      setMinutes(m);
    }
  }, [props.value]);

  function format_time(days, hours, minutes) {
    if (days === 0 && hours === 0 && minutes === 0) {
      return "";
    }
    const runtime_hours = Number(days) * 24 + Number(hours);
    return `${runtime_hours}:${Number(minutes)}`;
  }

  useEffect(() => {
    const newTime = format_time(days, hours, minutes);
    setValue(newTime);
    if (props.onChange) props.onChange(props.index, newTime);
  }, [days, hours, minutes]);

  function handleValueChange(event) {
    const { name, value } = event.target;
    const numValue = value === "" ? 0 : Number(value);
    
    switch (name) {
      case "days":
        setDays(numValue);
        break;
      case "hours":
        setHours(numValue);
        break;
      case "minutes":
        setMinutes(numValue);
        break;
      default:
        break;
    }
  }

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <div className="input-group">
        <input
          type="number"
          name="days"
          className="form-control"
          min="0"
          placeholder="Days"
          value={days || ""}
          onChange={handleValueChange}
        />
        <input
          type="number"
          name="hours"
          className="form-control"
          min="0"
          max="23"
          placeholder="Hours"
          value={hours || ""}
          onChange={handleValueChange}
        />
        <input
          type="number"
          name="minutes"
          className="form-control"
          min="0"
          max="59"
          placeholder="Minutes"
          value={minutes || ""}
          onChange={handleValueChange}
        />
      </div>
      <input name={props.name} type="hidden" value={value} />
      <input name={`${props.name}_days`} type="hidden" value={days} />
      <input name={`${props.name}_hours`} type="hidden" value={hours} />
      <input name={`${props.name}_minutes`} type="hidden" value={minutes} />
    </FormElementWrapper>
  );
}

export default Time;
