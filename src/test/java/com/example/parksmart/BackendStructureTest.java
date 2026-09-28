package com.example.parksmart;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.example.parksmart.service.ParkingLotService;
import com.example.parksmart.service.ParkingSlotService;
import com.example.parksmart.service.BookingService;
import com.example.parksmart.service.CheckInOutService;
import com.example.parksmart.service.ParkingBillService;
import org.junit.jupiter.api.Test;

class BackendStructureTest {

    @Test
    void backendServicesMustExist() {
        assertNotNull(ParkingLotService.class);
        assertNotNull(ParkingSlotService.class);
        assertNotNull(BookingService.class);
        assertNotNull(CheckInOutService.class);
        assertNotNull(ParkingBillService.class);
    }
}
