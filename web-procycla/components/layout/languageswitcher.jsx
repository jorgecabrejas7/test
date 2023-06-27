import styles from "@/styles/languageswitcher.module.css";
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { useTranslation } from 'next-i18next';
import { getWindowDimensions } from "@/lib/functions";
import { useSession } from "next-auth/react";
import { protectedFetch } from "@/lib/apifetch";

const LanguageSwitcher = () => {
    const { t } = useTranslation('common');
    const router = useRouter();
    const languages = router.locales;
    const currentLanguage = router.locale.toUpperCase();
    const session = useSession();

    const [menu, setMenu] = useState(false);

    const switchToLanguage = (language, updateUser = false) => {
        setMenu(false);
        const { pathname, asPath, query } = router;
        router.push({ pathname, query }, asPath, { locale: language });

        if(updateUser)
        protectedFetch(session, process.env.BACK_API_URL + "user?" + new URLSearchParams({ id: session.data.user.id }), "put", JSON.stringify({ language: language.toLowerCase() }), t);
    };

    const [windowDimensions, setWindowDimensions] = useState(null);

    useEffect(() => {
        const handleResize = () => {
            const dimensions = getWindowDimensions(window);
            
            if(dimensions)
            setWindowDimensions(dimensions);
        };

        if(window) {
            if(windowDimensions === null) handleResize();
            window.addEventListener('resize', handleResize);
        }
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if(session.status === "authenticated") {
            const fetchData = async () => {
                const user = session.data.user;
                const res = await protectedFetch(session, process.env.BACK_API_URL + "user/language?" + new URLSearchParams({ id: user.id }), "get", null, t);
                
                if(res.status === 200) {
                    const { language } = await res.json();
                    if(language === null) await protectedFetch(session, process.env.BACK_API_URL + "user?" + new URLSearchParams({ id: user.id }), "put", JSON.stringify({ language: currentLanguage.toLowerCase() }), t);
                    else if(language.toLowerCase() !== currentLanguage.toLowerCase()) switchToLanguage(language.toLowerCase());
                }
            }
            fetchData();
        }
    }, [session.status]);

    if(languages.length > 0) {
        return (
            <div className="d-flex flex-column">
                <div className={ styles.languageswitcher + " d-flex flex-column align-items-center justify-content-center cursor-pointer" } onClick={ () => setMenu(!menu) }>
                    {
                        windowDimensions && windowDimensions.width <= 600 ?
                            <span className="text-medium">{ currentLanguage } <ArrowDropDownIcon fontSize="large"/></span> :
                            <span className="text-medium">{ t('LANGUAGES.LANGUAGE') }: { currentLanguage } <ArrowDropDownIcon fontSize="large"/></span>
                    }
                </div>
                {
                    menu &&
                    <div className="d-flex flex-column" style={{ display: "block", position: "absolute", marginTop: 40 }}>
                        {
                            languages.map(language => (
                                <div key={ language } className={ styles.language + " d-flex flex-column align-items-left justify-content-center cursor-pointer  " + (currentLanguage === language.toUpperCase() ? styles.current : '') } onClick={ () => switchToLanguage(language, true) }>
                                    <span className="text-medium">{ t("LANGUAGES." + language.toUpperCase()) }</span>
                                </div>
                            ))
                        }
                    </div>
                }
            </div>
        );
    }
    else return <></>;
};

export default LanguageSwitcher;