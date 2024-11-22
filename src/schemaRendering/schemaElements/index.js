import Text from "./Text";
import Select from "./Select";
import Number from "./Number";
import Checkbox from "./Checkbox";
import RowContainer from "./RowContainer";
import RadioGroup from "./RadioGroup";
import Picker from "./Picker";
import Uploader from "./Uploader";
import Time from "./Time";
import Module from "./Module";
import Unit from "./Unit";
import UnknownElement from "./UnknownElement";
import DynamicSelect from "./DynamicSelect";


export {
	Text,
	Select,
	Number,
	Checkbox,
	RowContainer,
	RadioGroup,
	Picker,
	Uploader,
	Time,
	Module,
	Unit,
	UnknownElement,
	DynamicSelect
}
export const componentsMap = {
  text: Text,
  select: Select,
  number: Number,
  checkbox: Checkbox,
  rowContainer: RowContainer,
  radioGroup: RadioGroup,
  picker: Picker,
  uploader: Uploader,
  time: Time,
  module: Module,
  unit: Unit,
  dynamicSelect: DynamicSelect
};

