import {useEffect, useState} from "react";

// Hooks to check if currently in mobile view
const useIsMobile = () => {
    let wd: Window | undefined = undefined;
    if (typeof window !== "undefined") {
        wd = window;
      }
    const [width, setWidth] = useState(wd?.innerWidth ?? 999);

    const handleWindowSizeChange = () => {
            setWidth(window?.innerWidth);
    }

    useEffect(() => {
        wd?.addEventListener('resize', handleWindowSizeChange);
        return () => {
            wd?.removeEventListener('resize', handleWindowSizeChange);
        }
    }, [wd]);

    return (width <= 768);
}

export default useIsMobile;