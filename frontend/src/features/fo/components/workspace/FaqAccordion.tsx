import { Accordion, AccordionItem, AccordionTrigger, AccordionPanel } from '@/components/ui/accordion'

// Shared 6-question FAQ list — used verbatim by both TrainingModule (bottom
// card) and HelpModule (left column), per the task spec's "extract a shared
// component if that's cleaner" note.
export const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: 'How do I file a TA/DA claim?', a: 'Go to Expenses → File claim, pick the camp, enter the amount and vendor, and attach the bill. Claims must be filed within 15 days of the camp date.' },
  { q: 'What happens if I miss the 15-day claim window?', a: 'You can still file up to 30 days after the camp date, but it will be flagged as a late submission and needs manager exception. Beyond 30 days, filing is blocked.' },
  { q: 'How do I renew an expiring certification?', a: 'Open Training, find the course under its category, click Open, watch the refresher video and read the SOP, then click "Mark complete" to renew for another validity cycle.' },
  { q: 'Who approves my leave requests?', a: 'Your reporting manager approves leave requests. Conflicting camps on the requested dates are automatically flagged for their review.' },
  { q: 'What should I do in a medical emergency at camp?', a: 'Raise an SOS immediately from Incidents (or the emergency banner) — this notifies the Operations Manager and on-call support instantly with your camp and location.' },
  { q: 'How is my inventory FIFO suggestion calculated?', a: 'Lots are ranked by nearest expiry date first (First-Expiry-First-Out), so you always use the stock that will expire soonest before touching newer lots.' },
]

const FaqAccordion = () => (
  <Accordion multiple className="w-full">
    {FAQ_ITEMS.map((item, i) => (
      <AccordionItem key={i} value={String(i)} style={{ borderColor: 'var(--qms-border)' }}>
        <AccordionTrigger className="!text-[13px] !normal-case !tracking-normal !font-semibold" style={{ color: 'var(--qms-text)' }}>
          {item.q}
        </AccordionTrigger>
        <AccordionPanel className="!text-[12.5px] leading-relaxed" style={{ color: 'var(--qms-text-muted)' }}>
          {item.a}
        </AccordionPanel>
      </AccordionItem>
    ))}
  </Accordion>
)

export default FaqAccordion
