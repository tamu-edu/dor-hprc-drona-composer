import React, { useState } from "react";
import FieldRenderer from "../FieldRenderer";

function CollapsibleHeader({ title, isCollapsed, onToggle }) {
 return (
   <div className="flex items-center justify-between mb-4 border-b pb-3">
     <span className="text-lg font-semibold">{title}</span>
     <button 
       onClick={onToggle}
       className="px-4 py-2 bg-[#500000] text-white rounded hover:bg-[#400000] transition-colors flex items-center gap-2"
     >
       <span className="text-sm">
         {isCollapsed ? '▼' : '▲'}
       </span>
       <span>{isCollapsed ? 'Show' : 'Hide'} {title}</span>
     </button>
   </div>
 );
}

function CollapsibleRowContainer({
 elements,
 index,
 onChange,
 onFileChange,
 startingIndex,
 onSizeChange,
 currentValues,
 setError,
 title = "Collapsible Row Container",
}) {
 const [isCollapsed, setIsCollapsed] = useState(false);

 function toggleCollapse(e) {
   e.preventDefault();
   setIsCollapsed(prev => !prev);
 }

 return (
   <div className="border rounded p-4 mb-4">
     <CollapsibleHeader 
       title={title} 
       isCollapsed={isCollapsed} 
       onToggle={toggleCollapse} 
     />
     <div className={`transition-all duration-200 ${isCollapsed ? 'hidden' : ''}`}>
       <div className="space-y-4">
         <FieldRenderer
           fields={elements}
           handleValueChange={onChange}
           onFileChange={onFileChange}
           labelOnTop
           fieldStyles="w-full"
           startingIndex={startingIndex}
           currentValues={currentValues}
           setError={setError}
         />
       </div>
     </div>
   </div>
 );
}

function CollapsibleColContainer({
 elements,
 index,
 onChange,
 onFileChange,
 startingIndex,
 onSizeChange,
 currentValues,
 setError,
 title = "Collapsible Column Container",
}) {
 const [isCollapsed, setIsCollapsed] = useState(false);

 function toggleCollapse(e) {
   e.preventDefault();
   setIsCollapsed(prev => !prev);
 }

 return (
   <div className="border rounded p-4 mb-4">
     <CollapsibleHeader 
       title={title} 
       isCollapsed={isCollapsed} 
       onToggle={toggleCollapse} 
     />
     <div className={`transition-all duration-200 ${isCollapsed ? 'hidden' : ''}`}>
       <div className="flex flex-col space-y-4">
         <FieldRenderer
           fields={elements}
           handleValueChange={onChange}
           onFileChange={onFileChange}
           labelOnTop
           fieldStyles="w-full"
           startingIndex={startingIndex}
           currentValues={currentValues}
           setError={setError}
         />
       </div>
     </div>
   </div>
 );
}

export { CollapsibleRowContainer, CollapsibleColContainer };
