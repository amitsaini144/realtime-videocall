import { Cloud } from './cloud';

const MovingCloudsBackground = () => {
    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="relative w-full h-full">
                <Cloud delay={0} yPosition={0} size={1.4} />
                <Cloud delay={9} yPosition={15} size={0.8} />
                <Cloud delay={3} yPosition={60} size={1} />
                <Cloud delay={12} yPosition={70} size={1.3} />
                <Cloud delay={15} yPosition={100} size={0.9} />
                <Cloud delay={18} yPosition={35} size={1.1} />
                <Cloud delay={21} yPosition={85} size={1.4} />
                <Cloud delay={25} yPosition={45} size={1.2} />
            </div>
        </div>
    );
};

export default MovingCloudsBackground;