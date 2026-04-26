import { Box, Button } from "@mui/material";
import { ElementInterface } from "../../helpers";

interface Props {
  element: ElementInterface;
}

export function DonateLinkElement({ element }: Props) {
  let amounts: number[] = [];
  if (element.answers?.amounts && element.answers.amounts.length > 0) {
    try {
      amounts = JSON.parse(element.answers.amounts);
    } catch (e) {
      console.error("Failed to parse donation amounts JSON:", e);
    }
  }

  return (
    <div id={"el-" + element.id} data-testid={`donate-link-element-${element.id}`} aria-label="Donation options">
      <Box sx={{ backgroundColor: "white", padding: "20px", borderRadius: "15px", marginBottom: "15px" }}>
        <h4 style={{ marginTop: 10, marginBottom: 15 }}>
          {element.answers?.text?.toUpperCase() || "DONATE NOW"}
        </h4>
        {amounts?.map((a: number) => (
          <Button
            variant="outlined"
            size="small"
            key={a}
            sx={{ minWidth: "70px", marginRight: "10px", marginTop: "5px", borderWidth: "2px", borderRadius: "10px", fontWeight: "bold" }}
            href={`${element.answers?.url}?amount=${a}&fundId=${element.answers?.fundId}`}
            target="_blank"
            data-testid={`donate-amount-${a}-button`}
            aria-label={`Donate $${a}`}
          >
            $ {a}
          </Button>
        ))}
        <Button
          variant="outlined"
          size="small"
          sx={{ marginTop: "5px", borderWidth: "2px", borderRadius: "10px", fontWeight: "bold" }}
          href={`${element.answers?.url}?fundId=${element.answers?.fundId}`}
          target="_blank"
          data-testid="donate-other-amount-button"
          aria-label="Donate custom amount"
        >
          Other
        </Button>
      </Box>
    </div>
  );
}
