/**
 * Returns the time since in given date to show in UI.    
 * eg: 1m, 2h, 3d, 4mo, 5y.
 * @param date The date to compare to now()
 * @returns duration since in relative terms 
 */
export const getRelDate = (date: Date) => {
    const minutes = (Date.now() - date.getTime()) / 60000; // 60000 ms in a minute

    if (minutes < 60) return `${minutes.toFixed()}m`

    const hours =  minutes / 60;

    if (hours < 24) return `${hours.toFixed()}h`

    const days = hours / 24;

    if (days < 31) return `${days.toFixed()}d`

    const months = days / 30.5;

    if (months < 12) return `${months.toFixed()}mo`

    const years = months / 12;

    return `${years.toFixed()}y`
}