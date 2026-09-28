package com.example.parksmart.controller;

import com.example.parksmart.entity.CheckInOut;
import com.example.parksmart.service.CheckInOutService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/checkinout")
public class CheckInOutController {

    private final CheckInOutService checkInOutService;

    public CheckInOutController(CheckInOutService checkInOutService) {
        this.checkInOutService = checkInOutService;
    }

    @PostMapping("/check-in/{bookingId}")
    public ResponseEntity<CheckInOut> checkIn(@PathVariable Long bookingId) {
        CheckInOut checkInOut = checkInOutService.checkIn(bookingId);
        return new ResponseEntity<>(checkInOut, HttpStatus.CREATED);
    }

    @PostMapping("/check-out/{bookingId}")
    public ResponseEntity<CheckInOut> checkOut(@PathVariable Long bookingId) {
        CheckInOut checkInOut = checkInOutService.checkOut(bookingId);
        return ResponseEntity.ok(checkInOut);
    }

    @GetMapping
    public ResponseEntity<List<CheckInOut>> getAllCheckInOuts() {
        return ResponseEntity.ok(checkInOutService.getAllCheckInOuts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CheckInOut> getCheckInOutById(@PathVariable Long id) {
        return ResponseEntity.ok(checkInOutService.getCheckInOutById(id));
    }
}
