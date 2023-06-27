import Image from 'next/image';
import LanguageSwitcher from "@/components/layout/languageswitcher";
import Sidebar from "@/components/layout/sidebar";
import styles from "@/styles/layout.module.css";
import Router, { useRouter } from 'next/router';
import Link from "next/link";
import { getCurrentPageTitle, currentPageHasBackButton } from "@/lib/routes";
import { useTranslation } from 'next-i18next';
import Icon from '@mui/material/Icon';
import { useState, useEffect } from "react";
import { getWindowDimensions } from "@/lib/functions";
import { useSession } from "next-auth/react";
import { loader } from "@/components/loader/loader";
import Head from 'next/head';

const Layout = ({ children }) => {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { asPath } = useRouter();
    const pageTitle = getCurrentPageTitle(asPath);
    //let breadcummer = asPath.split('/').filter(i => i);
    const [sidebar, setSidebar] = useState(null);
    const session = useSession();
    const [ loading, setLoading ] = useState(true);
    
    useEffect(() => {
        loader(true);
    }, []);

    useEffect(() => {
        if(session.status === "unauthenticated") Router.replace("/auth/login");
        else if(session.status === "authenticated") {
            setLoading(false);
            loader(false);
        }
    }, [session.status]);

    const [windowDimensions, setWindowDimensions] = useState(null);

    useEffect(() => {
        const handleResize = () => {
            const dimensions = getWindowDimensions(window);
            
            if(dimensions) {
                if(sidebar === null) {
                    if(dimensions.width <= 600) setSidebar(false);
                    else setSidebar(true);
                }
                
                setWindowDimensions(dimensions);
            }
        };

        if(window) {
            if(windowDimensions === null) handleResize();
            window.addEventListener('resize', handleResize);
        }
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if(sidebar !== null && windowDimensions && windowDimensions.width <= 600)
        setSidebar(false);
    }, [asPath]);

    const isSidebarOpen = () => {
        if(sidebar === true) return true;
        return false;
    }

    /*const bcGetPartTranslation = (part, index) => {
        let partTranslation = "";
        if(breadcummer.length - 1 === index) partTranslation = pageTitle;
        else {
            const path = "/" + breadcummer.slice(0, index + 1).join("/");
            partTranslation = getCurrentPageTitle(path);
        }
        return partTranslation;
    };*/

    if(loading)
    return <></>;

    return (
        <>
            <Head>
                <title>Procycla | { t(pageTitle) }</title>
            </Head>
            <div className={ styles.page + " d-flex flex-column"}>
                <div className={ styles.topbar }/>
                <div className={ "d-flex flex-column justify-content-between " + styles.header }>
                    <div className="d-flex flex-row h-100 align-items-center justify-content-between">
                        <div className='d-flex flex-row align-items-center justify-content-between'>
                            <Link href={ "/home" } className="cursor-pointer"><Image src="/img/logo.png" alt="logo" width="0" height="0" sizes="100vw" className={ styles.logo }/></Link>
                            <Icon className={ styles.toggleSidebarIcon + ' cursor-pointer' } onClick={ () => setSidebar(!isSidebarOpen()) }>{ "menu" }</Icon>
                        </div>
                        <LanguageSwitcher/>
                    </div>
                </div>
                <div className={ styles.hbar }/>
                <div className="d-flex mt-20" style={{ height: "100%", maxHeight: "100%" }}>
                    <Sidebar toggle={ isSidebarOpen() }/>
                    <div className={ styles.content } style={{
                            left: sidebar ? ((windowDimensions && windowDimensions.width <= 600) ? "20px" : "360px") : "20px",
                            minWidth: sidebar ? ((windowDimensions && windowDimensions.width <= 600) ? "calc(100% - 40px)" : "calc(100% - 380px)") : "calc(100% - 40px)"
                    }}>
                        <span className='text-big primary-color text-uppercase fw-bold'>{ t(pageTitle) }</span>
                        {/*
                            currentPageHasBackButton(asPath) &&
                            <div className='d-flex flex-row align-items-center cursor-pointer' style={{ marginTop: '-5px' }} onClick={ () => router.back() }>
                                <Icon sx={{ fontSize: 15, marginRight: '5px' }}>keyboard_backspace</Icon>
                                <span className='text-small text-uppercase'>{ t('COMMON.GO_BACK') }</span>
                            </div>
                        */}
                        {/*<div className='d-flex flex-row'>
                            {
                                breadcummer.length > 1 && 
                                breadcummer.map((part, index) => {
                                    return (
                                        <Link key={ index } href={('/' + breadcummer.slice(0, index + 1).join("/"))} className='cursor-pointer'>
                                            <span className={ styles.bc + ' text-small ' + ((index === breadcummer.length - 1) ? 'primary-color' : 'secondary-color') + ' text-uppercase ' + ((index === breadcummer.length - 1) ? 'fw-bold' : '') }>
                                                { t(bcGetPartTranslation(part, index)) + ((index < breadcummer.length - 1) ? ' / ' : '') }
                                            </span>
                                        </Link>
                                    )
                                })
                            }
                        </div>*/}
                        <div className='mt-10 mb-20 w-100'>
                            { children }
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Layout;