import { User } from "@/app/page";

interface Message {
    recivedMessages: Array<{ content: string, sender: string }>;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    currentUser: User;

}

export default function MessageSection({ recivedMessages, messagesEndRef, currentUser }: Message) {
    return (
        <div className='w-full flex flex-col h-96'>
            <div className='flex-grow overflow-y-auto mb-4 bg-white rounded-xl p-4 scroll-smooth'>
                {recivedMessages.map((message, index) => {
                    const isCurrentUser = message.sender === currentUser.username;
                    return (
                        <div key={index} className={`mb-2 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-b-2xl px-5 py-2 ${isCurrentUser ? 'bg-[#03AED2] text-white rounded-l-2xl' : 'bg-[#DDDDDD] text-black rounded-r-2xl'}`}>
                                {!isCurrentUser && <div className="font-bold">{message.sender}</div>}
                                <div>{message.content}</div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
        </div>
    )
}
