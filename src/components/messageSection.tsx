import { User } from "@/app/page";

interface Message {
    recivedMessages: Array<{ content: string, sender: string }>;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    currentUser: User;

}

export default function MessageSection({ recivedMessages, messagesEndRef, currentUser }: Message) {
    return (
        <div className='w-full flex-grow flex flex-col h-[calc(100vh-340px)]'>
            <div className='flex-grow overflow-y-auto mb-4 bg-gray-800 rounded-xl p-4 scroll-smooth'>
                {recivedMessages.map((message, index) => {
                    const isCurrentUser = message.sender === currentUser.username;
                    return (
                        <div key={index} className={`mb-2 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-xl px-4 py-2 ${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-white text-black'}`}>
                                <div className="font-bold">{message.sender}</div>
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