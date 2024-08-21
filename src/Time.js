import React, { useState, useEffect } from "react";
import Label from "./Label"

function Time(props) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [value, setValue] = useState("");

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
    switch (name) {
      case "days":
        setDays(value);
        break;
      case "hours":
        setHours(value);
        break;
      case "minutes":
        setMinutes(value);
        break;
      default:
        break;
    }
  }

  return (
    <div className="form-group row">
      <Label name={props.name} label={props.label}/>
      <div className="col-lg-9">
        <div className="input-group">
          <input
            type="number"
            name="days"
            className="form-control"
            min="0"
            placeholder="Days"
            onChange={handleValueChange}
          />
          <input
            type="number"
            name="hours"
            className="form-control"
            min="0"
            max="23"
            placeholder="Hours"
            onChange={handleValueChange}
          />
          <input
            type="number"
            name="minutes"
            className="form-control"
            min="0"
            max="59"
            placeholder="Minutes"
            onChange={handleValueChange}
          />
        </div>
        <input name={props.name} type="hidden" value={value} />
      </div>
    </div>
  );
}

export default Time;
