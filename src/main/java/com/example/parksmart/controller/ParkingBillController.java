package com.example.parksmart.controller;

import com.example.parksmart.entity.ParkingBill;
import com.example.parksmart.service.ParkingBillService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bills")
public class ParkingBillController {

    private final ParkingBillService parkingBillService;

    public ParkingBillController(ParkingBillService parkingBillService) {
        this.parkingBillService = parkingBillService;
    }

    @GetMapping
    public ResponseEntity<List<ParkingBill>> getAllBills() {
        return ResponseEntity.ok(parkingBillService.getAllBills());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ParkingBill> getBillById(@PathVariable Long id) {
        return ResponseEntity.ok(parkingBillService.getBillById(id));
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<ParkingBill> getBillByBookingId(@PathVariable Long bookingId) {
        return ResponseEntity.ok(parkingBillService.getBillByBookingId(bookingId));
    }

    @PostMapping("/calculate/{bookingId}")
    public ResponseEntity<ParkingBill> calculateBill(@PathVariable Long bookingId) {
        return ResponseEntity.ok(parkingBillService.calculateBill(bookingId));
    }

    @PutMapping("/{id}/pay")
    public ResponseEntity<ParkingBill> payBill(@PathVariable Long id) {
        return ResponseEntity.ok(parkingBillService.markAsPaid(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBill(@PathVariable Long id) {
        parkingBillService.deleteBill(id);
        return ResponseEntity.noContent().build();
    }
}
