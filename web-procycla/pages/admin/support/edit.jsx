import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useSession } from "next-auth/react";
import { useState, useEffect, createRef } from "react";
import { loader } from "@/components/loader/loader";
import { protectedFetch } from "@/lib/apifetch";
import { getTicketStatusColor } from "@/lib/functions";
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';

export default () => {
    const { t } = useTranslation('common');

    const router = useRouter();
    const [id, setId] = useState(parseInt(router.query.id || 0));
    const session = useSession();
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const messagesEndRef = createRef();
    const [formMessageValue, setFormMessageValue] = useState(null);
    
    useEffect(() => {
        loader(true);
    }, []);

    useEffect(() => {
        if(id > 0 && session.status === "authenticated") {
            const fetchData = async () => {
                let res = await protectedFetch(session, process.env.BACK_API_URL + "admin/ticket?" + new URLSearchParams({ id_ticket: id }), "get", null, t);
                if(res.status === 200) {
                    const data = await res.json();
                    setTicket(data);
                }

                res = await protectedFetch(session, process.env.BACK_API_URL + "admin/ticket/messages?" + new URLSearchParams({ id_ticket: id }), "get", null, t);
                if(res.status === 200) {
                    const data = await res.json();
                    setMessages(data);
                }
                loader(false);
            }
            fetchData();
        }
    }, [session.status, id]);

    useEffect(() => {
        let { id: id_query } = router.query;
        if(id_query) id_query = parseInt(id_query);
        if(id != id_query) setId(id_query);
    }, [router.query]);
    
    useEffect(() => {
        if(messagesEndRef && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
        }
    }, [messages, messagesEndRef]);

    const handleSubmit = async e => {
        loader(true);
        e.preventDefault();

        const res = await protectedFetch(
            session, process.env.BACK_API_URL + "admin/ticket/message?" + new URLSearchParams({ id_ticket: id }),
            "post", JSON.stringify({ message: formMessageValue }), t);
        
        if(res.status === 200) {
            toast.success(t("COMMON.DATA_SUBMITTED"));
            const newMessage = await res.json();
            let cloneTicket = structuredClone(ticket);
            cloneTicket.status = 'answered';
            setTicket(cloneTicket);
            setMessages([ ...messages, newMessage ]);
            setFormMessageValue(null);
        }

        loader(false);
    };

    const toggleTicket = async (toggle) => {
        loader(true);

        const status = toggle ? 'answered' : 'finished';
        const res = await protectedFetch(
            session, process.env.BACK_API_URL + "admin/ticket?" + new URLSearchParams({ id_ticket: id }),
            "put", JSON.stringify({ status: status }), t);
        
        if(res.status === 200) {
            if(toggle) toast.success(t("PAGES.PROFILE.TICKET_EDIT.OPENED"));
            else toast.success(t("PAGES.PROFILE.TICKET_EDIT.CLOSED"));
            let cloneTicket = structuredClone(ticket);
            cloneTicket.status = status;
            setTicket(cloneTicket);
            setFormMessageValue(null);
        }

        loader(false);
    }

    if(!ticket)
    return <></>;

    const renderMessages = () => {
        return <div className='d-flex flex-column w-100 mt-10 mb-10' style={{ height: 600, overflow: 'auto', overflowAnchor: "none" }}>
            {
                messages.map(message => {
                    if(message.id_user === session.data.user.id) {
                        return (
                            <div key={ message.id } className='d-flex flex-column align-items-end m-10'>
                                <div className='d-flex flex-column p-30' style={{ width: '40%', backgroundColor: '#dfeaf2', borderRadius: '5px' }}>
                                    <span className="text-medium fw-bold">{ t("PAGES.PROFILE.TICKET_EDIT.YOU") } ({ message.updatedAt })</span>
                                    <span className="text-medium">{ message.message }</span>
                                </div>
                            </div>
                        );
                    }
                    else {
                        return (
                            <div key={ message.id } className='d-flex flex-column align-items-start m-10'>
                                <div className='d-flex flex-column p-30' style={{ width: '40%', backgroundColor: '#dff2e4', borderRadius: '5px' }}>
                                    <span className="text-medium fw-bold">{ message.user.email } ({ message.updatedAt })</span>
                                    <span className="text-medium">{ message.message }</span>
                                </div>
                            </div>
                        );
                    }
                })
            }
            <div ref={ messagesEndRef }/>
        </div>;
    }

    return <div className='d-flex flex-column'>
        <span className="title-medium fw-bold">{ ticket.title }</span>
        <span className="text-small">{ t("PAGES.PROFILE.TICKET_EDIT.BY", { author: ticket.user.email }) } ({ ticket.createdAt })</span>
        <div className='d-flex flex-row mb-30'>
            <span className={ "text-small " + (ticket.type !== "ticket" ? "primary-color" : "") }>{ t("PAGES.PROFILE.SUPPORT.TYPE_" + ticket.type.toUpperCase()) }</span>
            <span className="text-small mr-10 ml-10" >|</span>
            <span className="text-small" style={{ color: getTicketStatusColor(ticket.status.toUpperCase()) }}>{ t("PAGES.PROFILE.SUPPORT.STATUS_" + ticket.status.toUpperCase()) }</span>
        </div>
        { renderMessages() }
        <Box
            component="form"
            sx={{ '& > :not(style)': { m: 1, width: '100%', maxWidth: '100%' } }}
            autoComplete="off"
            onSubmit={ handleSubmit }
        >
            <div className="d-flex flex-row w-100 mt-10 align-items-center">
                <TextField id="message" label={ t("COMMON.MESSAGE") } variant="outlined" className="mb-10 mr-10 w-100" disabled={ ticket.status === "finished" ? true : false } multiline rows={ 4 }
                    value={ formMessageValue || "" } onChange={({ target }) => setFormMessageValue(target.value)}/>
                <Button variant="outlined" type="submit" disabled={ ticket.status === "finished" ? true : false }>{ t("COMMON.SUBMIT") }</Button>
            </div>
        </Box>
        {
            ticket.type === "ticket" && (
                ticket.status === "finished" ?
                <Button variant="contained" color='success' type="button" onClick={ () => toggleTicket(true) }>{ t("PAGES.PROFILE.TICKET_EDIT.OPEN") }</Button> :
                <Button variant="contained" color='error' type="button" onClick={ () => toggleTicket(false) }>{ t("PAGES.PROFILE.TICKET_EDIT.CLOSE") }</Button>
            )
        }
    </div>;
}

export async function getServerSideProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common']))
        }
    };
}