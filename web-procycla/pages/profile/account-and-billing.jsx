import Menu from "@/components/menu";
import { useState, useEffect, createRef } from "react";
import Button from '@mui/material/Button';
import styles from "@/styles/account-and-billing.module.css";
import Link from "next/link";
import Box from '@mui/material/Box';
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Icon from '@mui/material/Icon';
import { unprotectedFetch, protectedFetch } from "@/lib/apifetch";
import { toast } from 'react-toastify';
import { useTranslation } from 'next-i18next';
import { loader } from "@/components/loader/loader";
import { useSession } from "next-auth/react";
import { useRouter } from 'next/router';
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import ExtendedTable from '@/components/extendedtable';

const stripePromise = loadStripe(process.env.STRIPE_PUBLIC_KEY);

export default () => {
    const { t } = useTranslation('common');

    const router = useRouter();
    const session = useSession();
    const [page, setPage] = useState(parseInt(router.query.menu_page) || 0);
    const [user, setUser] = useState(null);
    const [plans, setPlans] = useState([]);
    const [purchaseDialog, setPurchaseDialog] = useState({ display: false, planIndex: -1, autoRenewal: false });
    const availablePlansRef = createRef();

    useEffect(() => {
        loader(true);
    }, []);

    useEffect(() => {
        let { menu_page } = router.query;
        if(!menu_page) menu_page = 0;
        else menu_page = parseInt(menu_page);

        if(page != menu_page)
        setPage(menu_page);
    }, [router.query]);

    const loadUser = async () => {
        const sessionUser = session.data.user;
        let res = await protectedFetch(session, process.env.BACK_API_URL + "user?" + new URLSearchParams({ id: sessionUser.id }), "get", null, t);
        if(res.status === 200) {
            let newUser = await res.json();
            
            res = await protectedFetch(session, process.env.BACK_API_URL + "stripe/set_customer", "get", null, t);
            if(res.status === 200) {
                const { stripe_customer_id } = await res.json();
                newUser = { ...newUser, stripe_customer_id: stripe_customer_id };
            }

            res = await protectedFetch(session, process.env.BACK_API_URL + "stripe/setup_card", "get", null, t);
            if(res.status === 200) {
                const { client_secret } = await res.json();
                newUser = { ...newUser, stripe_client_secret: client_secret };
            }

            setUser(newUser);
        }
    };

    useEffect(() => {
        if(session.status === "authenticated") {
            const fetchData = async () => {
                await loadUser();

                const res = await unprotectedFetch(process.env.BACK_API_URL + "plan", "get", null, t);
                if(res.status === 200) {
                    const data = await res.json();
                    setPlans(data);
                }

                loader(false);
            }
            fetchData();
        }
    }, [session.status]);

    const getUserCurrentPlanName = () => {
        if(user && plans && user.id_plan) {
            return t(`PLANS.ID_${ user.id_plan }.NAME`);
        }
        return null;
    }

    const handleDialogClose = () => {
        setPurchaseDialog({ display: false, planIndex: -1, autoRenewal: false });
    };

    const handleDialogPurchase = async () => {
        const plan = plans[purchaseDialog.planIndex];
        const autoRenewal = purchaseDialog.autoRenewal;
        const id = plan.id;

        loader(true);
        setPurchaseDialog({ display: false, planIndex: -1, autoRenewal: false });

        const sessionUser = session.data.user;
        let res = await protectedFetch(session, process.env.BACK_API_URL + "stripe/charge_plan?" + new URLSearchParams({ id_user: sessionUser.id, id: id, auto_renewal: autoRenewal }), "get", null, t);
        
        if(res.status === 200) {
            const charge = await res.json();
            if(charge.ok) {
                await loadUser();
                toast.success(t("PAGES.PROFILE.ACCOUNT_BILLING.PAY_SUCCESS"));
            }
            else toast.error(t("PAGES.PROFILE.ACCOUNT_BILLING.PAY_ERROR"));
        }

        loader(false);
    };

    const changeToPlan = async planIndex => {
        if(!user?.credit_card_number || user?.credit_card_number.length <= 1) {
            toast.error(t("PAGES.PROFILE.ACCOUNT_BILLING.NO_CREDIT_CARD"));
            setPage(2);
            return;
        }

        setPurchaseDialog({ display: true, planIndex: planIndex, autoRenewal: false });
    }

    const CreditCardForm = () => {
        const
            stripe = useStripe(),
            elements = useElements();

        const handleSubmit = async e => {
            e.preventDefault();

            if(!stripe || !elements) {
                return;
            }

            loader(true);
            
            const res = await protectedFetch(session, process.env.BACK_API_URL + "stripe/delete_card", "get", null, t);
            if(res.status === 200) {
                const { error } = await stripe.confirmSetup({ elements, confirmParams: { return_url: process.env.NEXT_PUBLIC_API_URL + 'profile/account-and-billing' } });
                
                if(error)
                toast.error(error.message);
            }

            loader(false);
        };

        return (
            <Box
                component="form"
                sx={{ '& > :not(style)': { m: 1, width: '80ch', maxWidth: '100%' } }}
                autoComplete="off"
                onSubmit={ handleSubmit }
            >
                    <div className="d-flex flex-column">
                        <PaymentElement />
                        <Button className="mt-10" variant="contained" size="large" type="submit" disabled={ !stripe }>{ t("COMMON.SAVE_CHANGES") }</Button>
                    </div>
            </Box>
        );
    };

    const cancelAutoRenewal = async () => {
        loader(true);
        
        const sessionUser = session.data.user;
        const res = await protectedFetch(session, process.env.BACK_API_URL + "stripe/cancel_subscription?" + new URLSearchParams({ id_user: sessionUser.id }), "get", null, t);
        if(res.status === 200) {
            await loadUser();
            toast.success(t("COMMON.DATA_UPDATED"));
        }
        
        loader(false);
    };
   
    const renderPage = () => {
        if(page === 0) {
            return (
                <div className="d-flex flex-column">
                    {
                        user?.id_plan != null &&
                        <>
                            <div className={ styles.currentPlanCard }>
                                <div className="d-flex flex-column">
                                    <span className={ "text-small" }>{ t("PAGES.PROFILE.ACCOUNT_BILLING.CURRENT_PLAN") }</span>
                                    <span className={ "text-medium fw-bold" }>{ getUserCurrentPlanName() } <span className={ user.plan_expired ? "text-danger" : "" }>({
                                        user?.plan_auto_renewal ?
                                            t('PAGES.PROFILE.ACCOUNT_BILLING.PLAN_NEXT_PAY', { days: user.plan_expires_in }).toLowerCase() :
                                            user.plan_expired ? t('COMMON.EXPIRED') : t('PAGES.PROFILE.ACCOUNT_BILLING.PLAN_DAYS_LEFT', { days: user.plan_expires_in })
                                    })</span></span>
                                    <span className={ "text-small primary-color fw-normal cursor-pointer" } onClick={ () => { availablePlansRef?.current && window.scrollTo({ top: availablePlansRef.current.offsetTop, behavior: 'smooth' }) } }>{ t('PAGES.PROFILE.ACCOUNT_BILLING.INCLUDED') }</span>
                                </div>
                                <div className="d-flex align-items-center">
                                    <div className="d-flex align-items-center mr-10">
                                        <Icon>credit_card</Icon>
                                        <span className={ "ml-10 mr-10 text-small" }>{ user?.credit_card_number || t('COMMON.NONE').toLowerCase() }</span>
                                        <Button variant="outlined" type="button" className="m-10" color="success" onClick={ () => setPage(2) }><Icon>edit</Icon></Button>
                                    </div>
                                    <Button variant="contained" type="button" className="m-10" onClick={ () => { availablePlansRef?.current && window.scrollTo({ top: availablePlansRef.current.offsetTop, behavior: 'smooth' }) } }>{ t('PAGES.PROFILE.ACCOUNT_BILLING.CHANGE_PLAN') }</Button>
                                    { user.plan_auto_renewal && <Button variant="outlined" type="button" color="error" className="m-10" onClick={ () => cancelAutoRenewal() }>{ t('PAGES.PROFILE.ACCOUNT_BILLING.CANCEL_AUTO_RENEWAL') }</Button> }
                                </div>
                            </div>
                            {/*
                                <div className="d-flex flex-column mt-20">
                                    <div className="d-flex flex-row justify-content-between align-items-center">
                                        <span className={ "text-medium text-uppercase fw-bold" }>Extra data subscriptions</span>
                                        <Button variant="outlined" type="button" className="m-10">Add extra market data</Button>
                                    </div>
                                    <p className="text-small text-secondary text-justify">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum semper nunc sit amet ipsum dapibus aliquet. Duis congue, purus eget sollicitudin consectetur, erat nisi dignissim ante, eget maximus nibh nunc nec urna. Aliquam pretium vulputate urna id consequat. Pellentesque est arcu, hendrerit ut nisi ut, ultrices volutpat ligula. Sed vehicula euismod euismod. Fusce lacinia leo quis hendrerit dapibus. Aliquam vitae leo nunc. Fusce neque orci, condimentum hendrerit luctus eget, vehicula molestie lorem. Suspendisse sodales porttitor diam, ut aliquam enim mollis in. Aliquam facilisis feugiat vulputate. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Integer facilisis risus vel eros porttitor efficitur. Sed vel tortor ac risus laoreet venenatis at porta turpis. Fusce imperdiet sapien vel enim sagittis, sed porta ipsum accumsan. Quisque porta, orci et condimentum convallis, mauris ante convallis erat, vel aliquam tortor justo quis nisi.</p>
                                </div>
                            */}
                        </>
                    }
                    <span ref={ availablePlansRef } className={ "mt-20 text-medium text-uppercase fw-bold" }>{ t('PAGES.PROFILE.ACCOUNT_BILLING.AVAILABLE_PLANS') }</span>
                    <div className="d-flex flex-wrap">
                    {
                        plans.map((plan, planIndex) => 
                            <div key={ plan.id } className={ styles.cardPlan }>
                                <span className={ "title-small fw-bold" }>{ t(plan.name) }</span>
                                <span className={ "text-small" }>{ t(plan.description) }</span>
                                <ul className="mt-10 mb-10 list-unstyled">
                                    {
                                        (t(plan.benefits, { returnObjects: true })).map((benefit, index) =>
                                            <li key={ index } className="d-flex"><Icon className="primary-color">done</Icon> <span>{ benefit }</span></li>
                                        )
                                    }
                                </ul>
                                <div className={ "d-flex flex-column align-items-center m-30" }>
                                    <span className={ "text-medium fw-bold" }>{ t(plan.price) + ' ' + t(plan.currency) }</span>
                                    <span className={ "text-small" }>{ t('PAGES.PROFILE.ACCOUNT_BILLING.DURATION', { days: plan.duration_days }) }</span>
                                </div>
                                <div>
                                    {
                                        plan.id === user.id_plan ?
                                        <Button variant="outlined" type="button" disabled>{ t('PAGES.PROFILE.ACCOUNT_BILLING.CURRENT_PLAN') }</Button> :
                                        <Button variant="outlined" type="button" onClick={ () => changeToPlan(planIndex) }>{ t('COMMON.SELECT') }</Button>
                                    }

                                </div>
                            </div>
                        )
                    }
                    </div>
                    <Dialog
                        open={ purchaseDialog.display }
                        onClose={ handleDialogClose }
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                    >
                        <DialogTitle id="alert-dialog-title">
                            <span className={ "text-big fw-bold" }>{ t('PAGES.PROFILE.ACCOUNT_BILLING.CONFIRM_PURCHASE') }</span>
                        </DialogTitle>
                        { purchaseDialog.planIndex >= 0 &&
                            <DialogContent>
                                <DialogContentText id="alert-dialog-description" className="d-flex align-items-center">
                                    <span className={ "text-medium fw-bold" }>{ t('COMMON.PLAN') }</span>
                                </DialogContentText>
                                <DialogContentText id="alert-dialog-description" className="mb-10">
                                    <span className={ "text-small" }>{ t(plans[purchaseDialog.planIndex].name) } | { t(plans[purchaseDialog.planIndex].description) }</span>
                                </DialogContentText>

                                <DialogContentText id="alert-dialog-description" className="d-flex align-items-center">
                                    <span className={ "text-medium fw-bold" }>{ t('COMMON.PRICE') }</span>
                                </DialogContentText>
                                <DialogContentText id="alert-dialog-description" className="mb-10">
                                    <span className={ "text-small fw-bold mr-10" }>{ t(plans[purchaseDialog.planIndex].price) + ' ' + t(plans[purchaseDialog.planIndex].currency) }</span>
                                    <span className={ "text-small" }>{ t('PAGES.PROFILE.ACCOUNT_BILLING.DURATION', { days: plans[purchaseDialog.planIndex].duration_days }).toLowerCase() }</span>
                                </DialogContentText>

                                <DialogContentText id="alert-dialog-description" className="d-flex align-items-center">
                                    <Icon>credit_card</Icon>
                                    <span className={ "text-medium fw-bold ml-10" }>{ t('PAGES.PROFILE.ACCOUNT_BILLING.CREDIT_CARD') }</span>
                                </DialogContentText>
                                <DialogContentText id="alert-dialog-description" className="mb-10">
                                    <span className={ "text-small fw-bold" }>{ user?.credit_card_number }</span>
                                </DialogContentText>

                                <DialogContentText id="alert-dialog-description" className="d-flex align-items-center mb-10">
                                    <FormGroup>
                                        <FormControlLabel control={<Switch color="secondary" checked={ purchaseDialog.autoRenewal } onChange={ ({ target }) => setPurchaseDialog({ ...purchaseDialog, autoRenewal: target.checked }) }/>} label={ t('PAGES.PROFILE.ACCOUNT_BILLING.AUTO_RENEWAL_LABEL') } />
                                    </FormGroup>
                                </DialogContentText>
                            </DialogContent>
                        }
                        <DialogActions>
                            <Button color="error" onClick={ handleDialogClose }>{ t('COMMON.CANCEL') }</Button>
                            <Button variant="outlined" onClick={ handleDialogPurchase } >{ t('COMMON.PURCHASE') }</Button>
                        </DialogActions>
                    </Dialog>
                </div>
            );
        }
        else if(page === 1) {
            const columns = [
                { field: 'updatedAt', headerName: t("COMMON.DATE"), width: 200 },
                { field: 'transaction_id', headerName: t("PAGES.PROFILE.ACCOUNT_BILLING.TRANSACTION_ID"), width: 300 },
                { field: 'title', headerName: t("COMMON.TITLE"), width: 250, renderCell: ({ row }) => row.title ? t(row.title) : t('COMMON.NONE') },
                { field: 'total', headerName: t("COMMON.TOTAL"), width: 200 },
                {
                    field: 'invoice_url',
                    headerName: t("PAGES.PROFILE.ACCOUNT_BILLING.INVOICE"),
                    width: 200,
                    sortable: false,
                    renderCell: ({ row }) => (row.invoice_url && <Link href={ row.invoice_url }><Button variant="outlined" type="button">{ t('COMMON.DOWNLOAD') }</Button></Link>)
                  },
            ];
              
            return (
                <ExtendedTable
                    columns={ columns }
                    paginationWithId
                    pageSize={ 20 }
                    options={{
                        session: session,
                        fetchUrl: process.env.BACK_API_URL + "stripe/get_invoices",
                        t: t
                    }}
                />
            );
        }
        else if(page === 2 && user) {
            const deleteCreditCard = async () => {
                loader(true);
        
                const res = await protectedFetch(session, process.env.BACK_API_URL + "stripe/delete_card", "get", null, t);
                if(res.status === 200) {
                    await loadUser();
                    toast.success(t("COMMON.DATA_UPDATED"));
                }
               
                loader(false);
            };

            return (
                <div>
                    <div className="d-flex flex-row align-items-center">
                        <span className={ "text-medium fw-bold" }>{ t("PAGES.PROFILE.ACCOUNT_BILLING.CURRENT_CARD", { card: user?.credit_card_number || t('COMMON.NONE').toLowerCase() }) }</span>
                        { user?.credit_card_number && <span className="ml-10 text-small fw-bold text-danger cursor-pointer text-lowercase" onClick={ () => deleteCreditCard() }>{ t('COMMON.DELETE') }</span> }
                    </div>
                    {
                        user.stripe_client_secret &&
                        <Elements stripe={ stripePromise } options={{ clientSecret: user.stripe_client_secret }}>
                            <CreditCardForm/>
                        </Elements>
                    }
                </div>
            );
        }
        return <></>;
    };

    return (
        <div className="d-flex flex-column">
            <Menu options={ [t("PAGES.PROFILE.ACCOUNT_BILLING.MY_PLAN"), t("PAGES.PROFILE.ACCOUNT_BILLING.BILLING_HISTORY"), t("PAGES.PROFILE.ACCOUNT_BILLING.CREDIT_CARD")] } menuOptionChanged={ selectedOption => setPage(selectedOption) } selectedOption={ page }/>
            { renderPage() }
        </div>
    );
};

export async function getStaticProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common']))
        }
    };
}