import { useState, useRef } from 'react';

/**
 * Modern floating label input with integrated icons and validation states
 */
export default function FloatingLabelInput({
  id,
  name,
  type = 'text',
  label,
  value,
  onChange,
  onBlur,
  error,
  success,
  startIcon,
  endIcon,
  disabled = false,
  readOnly = false,
  dir = 'rtl',
  maxLength,
  placeholder = ' ', // space is required for peer-placeholder-shown trick
  className = '',
  onEndIconClick,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  
  const hasError = !!error;
  const hasSuccess = !!success && !hasError;
  const isLtr = dir === 'ltr';

  // Base layout sizing
  const H = 'h-14';
  
  // Padding calculations depending on icons
  const iconPaddingClass = isLtr
    ? `${startIcon ? 'pl-11' : 'pl-4'} ${((isPassword) || endIcon || hasSuccess || hasError) ? 'pr-11' : 'pr-4'}`
    : `${startIcon ? 'pr-11' : 'pr-4'} ${((isPassword) || endIcon || hasSuccess || hasError) ? 'pl-11' : 'pl-4'}`;

  // Label positioning calculations 
  // Peer label floats when input is focused OR when placeholder is NOT shown (meaning it has value)
  const labelLtrClass = startIcon ? 'peer-focus:left-4 peer-focus:-translate-y-3 left-11 peer-[&:not(:placeholder-shown)]:-translate-y-3 peer-[&:not(:placeholder-shown)]:left-4' : 'left-4 peer-focus:-translate-y-3 peer-[&:not(:placeholder-shown)]:-translate-y-3';
  const labelRtlClass = startIcon ? 'peer-focus:right-4 peer-focus:-translate-y-3 right-11 peer-[&:not(:placeholder-shown)]:-translate-y-3 peer-[&:not(:placeholder-shown)]:right-4' : 'right-4 peer-focus:-translate-y-3 peer-[&:not(:placeholder-shown)]:-translate-y-3';
  
  const labelTranslateClass = isLtr ? labelLtrClass : labelRtlClass;

  // Colors based on state
  let borderColor = 'border-slate-200 focus:border-primary focus:ring-primary/20 hover:border-slate-300';
  let bgColor = 'bg-slate-50 focus:bg-white transition-colors';
  let labelColor = 'text-slate-400 peer-focus:text-primary';
  let iconColor = 'text-slate-400 peer-focus:text-primary';

  if (hasError) {
    borderColor = 'border-rose overflow-hidden focus:border-rose focus:ring-rose/20 hover:border-rose';
    bgColor = 'bg-rose/5';
    labelColor = 'text-rose peer-focus:text-rose';
    iconColor = 'text-rose';
  } else if (hasSuccess) {
    borderColor = 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-500';
    bgColor = 'bg-emerald-50/50';
    labelColor = 'text-emerald-600 peer-focus:text-emerald-600';
    iconColor = 'text-emerald-500';
  }

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative group">
        <input
          ref={inputRef}
          id={id || name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          readOnly={readOnly}
          dir={dir}
          maxLength={maxLength}
          placeholder={placeholder}
          {...rest}
          className={`peer w-full ${H} rounded-xl border-2 ${bgColor} ${borderColor} focus:ring-4 outline-none transition-all duration-300 ${iconPaddingClass} ${isLtr ? 'text-left' : 'text-right'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} text-[#0f172a] font-medium pt-3.5 pb-1 placeholder-transparent`}
        />
        
        {/* Floating Label */}
        <label
          htmlFor={id || name}
          className={`absolute top-1/2 -translate-y-1/2 ${labelTranslateClass} ${labelColor} pointer-events-none transition-all duration-300 text-[13px] peer-focus:text-[11px] peer-focus:font-semibold peer-[&:not(:placeholder-shown)]:text-[11px] peer-[&:not(:placeholder-shown)]:font-semibold origin-center peer-focus:top-[14px] peer-[&:not(:placeholder-shown)]:top-[14px]`}
        >
          {label}
        </label>

        {/* Start Icon */}
        {startIcon && (
          <div className={`absolute top-0 bottom-0 ${isLtr ? 'left-0 pl-3.5' : 'right-0 pr-3.5'} flex items-center justify-center pointer-events-none`}>
            <span className={`material-symbols-outlined text-[20px] transition-colors duration-300 ${iconColor} ${hasError ? '' : 'group-focus-within:text-primary'}`}>
              {startIcon}
            </span>
          </div>
        )}

        {/* End Actions (Password Toggle, Custom End Icon, Validation Status) */}
        <div className={`absolute top-0 bottom-0 ${isLtr ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center justify-center gap-1.5`}>
          {isPassword && !disabled && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
              tabIndex={-1}
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          )}
          
          {endIcon && !isPassword && !hasError && !hasSuccess && (
            <button
              type="button"
              onClick={onEndIconClick}
              disabled={!onEndIconClick || disabled}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-slate-400 transition-colors ${onEndIconClick && !disabled ? 'hover:text-slate-600 hover:bg-slate-100 cursor-pointer' : 'cursor-default'}`}
              tabIndex={-1}
            >
              <span className="material-symbols-outlined text-[20px]">{endIcon}</span>
            </button>
          )}

          {hasError && !isPassword && (
            <div className="w-8 h-8 flex items-center justify-center pointer-events-none">
              <span className="material-symbols-outlined text-[20px] text-rose">error</span>
            </div>
          )}

          {hasSuccess && !isPassword && (
            <div className="w-8 h-8 flex items-center justify-center pointer-events-none">
              <span className="material-symbols-outlined text-[20px] text-emerald-500">check_circle</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message Below */}
      {hasError && (
        <div className={`mt-1.5 flex items-start gap-1.5 text-[11.5px] font-medium text-rose ${isLtr ? 'text-left' : 'text-right'} transform origin-top animate-in slide-in-from-top-1 fade-in duration-200`}>
          {typeof error === 'string' && <span>{error}</span>}
        </div>
      )}
    </div>
  );
}
