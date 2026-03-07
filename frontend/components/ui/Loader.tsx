import React from "react";

const Loader = () => {
    return (
        <div className="flex items-center justify-center w-full py-20">
            <div className="relative w-[150px] h-[150px] sm:w-[250px] sm:h-[250px]">
                {/* Ripple Circles */}
                <div className="absolute inset-[40%] rounded-full bg-gradient-to-b from-gray-500/20 to-gray-700/20 border-t border-gray-500 backdrop-blur-md animate-ripple z-[99] flex items-center justify-center">

                    {/* Music Icon */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="w-8 h-8 sm:w-12 sm:h-12 animate-color-change"
                        fill="#9CA3AF"
                    >
                        <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                    </svg>
                </div>

                <div className="absolute inset-[30%] rounded-full bg-gradient-to-b from-gray-500/20 to-gray-700/20 border-t border-gray-400 animate-ripple z-[98]" style={{ animationDelay: "0.2s" }} />
                <div className="absolute inset-[20%] rounded-full bg-gradient-to-b from-gray-500/20 to-gray-700/20 border-t border-gray-300 animate-ripple z-[97]" style={{ animationDelay: "0.4s" }} />
                <div className="absolute inset-[10%] rounded-full bg-gradient-to-b from-gray-500/20 to-gray-700/20 border-t border-gray-200 animate-ripple z-[96]" style={{ animationDelay: "0.6s" }} />
                <div className="absolute inset-[0%] rounded-full bg-gradient-to-b from-gray-500/20 to-gray-700/20 border-t border-gray-100 animate-ripple z-[95]" style={{ animationDelay: "0.8s" }} />
            </div>
        </div>
    );
};

export default Loader;
